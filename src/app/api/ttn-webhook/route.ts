import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sensor types that the MeasureMate device can report. */
type SensorType = 'ph' | 'ec' | 'temperature' | 'depth'

/** The subset of the TTN uplink webhook payload we care about. */
interface TTNUplinkPayload {
  end_device_ids: {
    device_id: string
    application_ids: {
      application_id: string
    }
    dev_eui: string
    join_eui?: string
    dev_addr?: string
  }
  received_at: string
  uplink_message: {
    f_port?: number
    f_cnt?: number
    frm_payload?: string
    decoded_payload?: {
      ph?: number | null
      ec?: number | null
      temperature?: number | null
      depth?: number | null
      battery?: number | null
      status?: {
        ph_ok?: boolean
        ec_ok?: boolean
        temp_ok?: boolean
        depth_ok?: boolean
      }
    }
    received_at?: string
  }
}

interface SensorRow {
  id: string
  name: string
  user_id: string
  measuremate_id: string
  sensor_type: string
  alert_threshold: number | null
  alert_lower_threshold: number | null
  measuremates: { name: string }[]
}

interface InsertedReading {
  sensor_id: string
  sensor_name: string
  sensor_type: string
  value: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Supabase client using the service role key so we can bypass RLS.
 * Follows the same pattern used in the existing sensor-data routes.
 */
async function getServiceClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Validate the webhook secret supplied by TTN.
 *
 * TTN can send the secret via:
 *   - `X-TTN-Webhook-Secret` header (recommended)
 *   - `?secret=` query parameter (fallback)
 *
 * The expected value is stored in the `TTN_WEBHOOK_SECRET` env var.
 */
function validateWebhookSecret(request: NextRequest): boolean {
  const expected = process.env.TTN_WEBHOOK_SECRET
  if (!expected) {
    // If no secret is configured we reject everything to prevent an
    // accidentally open endpoint.
    console.error('TTN_WEBHOOK_SECRET environment variable is not set')
    return false
  }

  // 1. Check header
  const headerSecret = request.headers.get('X-TTN-Webhook-Secret')
  if (headerSecret && headerSecret === expected) {
    return true
  }

  // 2. Fallback: query parameter
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')
  if (querySecret && querySecret === expected) {
    return true
  }

  return false
}

/**
 * Check whether a sensor value exceeds its configured thresholds and, if so,
 * trigger a notification via the internal notification API.
 *
 * Mirrors the logic in `/api/sensor-data/route.ts`.
 */
async function checkThresholdsAndNotify(
  sensor: SensorRow,
  currentValue: number
) {
  try {
    const upperThreshold = sensor.alert_threshold
    const lowerThreshold = sensor.alert_lower_threshold

    if (!upperThreshold && !lowerThreshold) {
      return
    }

    let notificationType: string | null = null
    let thresholdValue: number | null = null

    if (upperThreshold && currentValue > upperThreshold) {
      notificationType = 'upper'
      thresholdValue = upperThreshold
    } else if (lowerThreshold && currentValue < lowerThreshold) {
      notificationType = 'lower'
      thresholdValue = lowerThreshold
    }

    if (!notificationType || !thresholdValue) {
      return
    }

    const supabaseService = await getServiceClient()
    const { data: user } = await supabaseService.auth.admin.getUserById(
      sensor.user_id
    )

    if (!user?.user?.email) {
      console.error('No email found for user:', sensor.user_id)
      return
    }

    const notificationPayload = {
      userId: sensor.user_id,
      sensorId: sensor.id,
      sensorName: sensor.name,
      measuremateName: sensor.measuremates?.[0]?.name,
      currentValue,
      thresholdValue,
      thresholdType: notificationType,
      userEmail: user.user.email,
    }

    const notificationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify(notificationPayload),
      }
    )

    if (!notificationResponse.ok) {
      const error = await notificationResponse.text()
      console.error('Notification send failed:', error)
    }
  } catch (error) {
    console.error('Error in threshold check:', error)
    // Notification failure should never break the data ingest pipeline.
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/ttn-webhook
 *
 * Receives a TTN (The Things Network) uplink webhook, maps the device to a
 * MeasureMate via `dev_eui`, and inserts one `sensor_data` row for each
 * reported sensor value (pH, EC, temperature, depth).
 *
 * Authentication: `X-TTN-Webhook-Secret` header or `?secret=` query param
 * must match the `TTN_WEBHOOK_SECRET` environment variable.
 */
export async function POST(request: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Authenticate the webhook request
    // ------------------------------------------------------------------
    if (!validateWebhookSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or missing webhook secret' },
        { status: 401 }
      )
    }

    // ------------------------------------------------------------------
    // 2. Parse the TTN payload
    // ------------------------------------------------------------------
    let payload: TTNUplinkPayload
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const devEui = payload?.end_device_ids?.dev_eui
    if (!devEui) {
      return NextResponse.json(
        { error: 'Missing end_device_ids.dev_eui in payload' },
        { status: 400 }
      )
    }

    const decodedPayload = payload?.uplink_message?.decoded_payload
    if (!decodedPayload) {
      return NextResponse.json(
        { error: 'Missing uplink_message.decoded_payload — is the payload decoder configured in TTN?' },
        { status: 400 }
      )
    }

    // ------------------------------------------------------------------
    // 3. Look up the MeasureMate by dev_eui
    // ------------------------------------------------------------------
    const supabase = await getServiceClient()

    const { data: measuremate, error: mmError } = await supabase
      .from('measuremates')
      .select('id, user_id, name')
      .eq('dev_eui', devEui)
      .single()

    if (mmError || !measuremate) {
      console.error(
        `No measuremate found for dev_eui "${devEui}":`,
        mmError?.message
      )
      return NextResponse.json(
        { error: `No MeasureMate registered for dev_eui "${devEui}"` },
        { status: 404 }
      )
    }

    // ------------------------------------------------------------------
    // 4. Fetch all sensors belonging to this MeasureMate
    // ------------------------------------------------------------------
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select(`
        id, name, user_id, measuremate_id, sensor_type,
        alert_threshold, alert_lower_threshold,
        measuremates(name)
      `)
      .eq('measuremate_id', measuremate.id)

    if (sensorsError) {
      console.error('Failed to fetch sensors:', sensorsError.message)
      return NextResponse.json(
        { error: 'Failed to fetch sensors for this MeasureMate' },
        { status: 500 }
      )
    }

    if (!sensors || sensors.length === 0) {
      return NextResponse.json(
        { error: `No sensors configured for MeasureMate "${measuremate.name}"` },
        { status: 404 }
      )
    }

    // Build a lookup map: sensor_type -> SensorRow
    const sensorByType = new Map<string, SensorRow>()
    for (const s of sensors) {
      if (s.sensor_type) {
        sensorByType.set(s.sensor_type.toLowerCase(), s as SensorRow)
      }
    }

    // ------------------------------------------------------------------
    // 5. Insert sensor_data rows for each reported value
    // ------------------------------------------------------------------
    const timestamp =
      payload.uplink_message.received_at ??
      payload.received_at ??
      new Date().toISOString()

    const sensorTypes: SensorType[] = ['ph', 'ec', 'temperature', 'depth']
    const inserted: InsertedReading[] = []
    const skipped: string[] = []

    for (const type of sensorTypes) {
      const value = decodedPayload[type]

      // Skip null / undefined values
      if (value === null || value === undefined) {
        skipped.push(`${type} (no value)`)
        continue
      }

      const sensor = sensorByType.get(type)
      if (!sensor) {
        skipped.push(`${type} (no matching sensor)`)
        continue
      }

      const { error: insertError } = await supabase
        .from('sensor_data')
        .insert({
          sensor_id: sensor.id,
          user_id: sensor.user_id,
          value,
          timestamp,
        })

      if (insertError) {
        console.error(
          `Failed to insert ${type} reading:`,
          insertError.message
        )
        skipped.push(`${type} (insert failed)`)
        continue
      }

      inserted.push({
        sensor_id: sensor.id,
        sensor_name: sensor.name,
        sensor_type: type,
        value,
      })

      // Check thresholds (fire-and-forget; errors are logged but not fatal)
      checkThresholdsAndNotify(sensor, value)
    }

    // ------------------------------------------------------------------
    // 6. Update last_data_received_at on the MeasureMate
    // ------------------------------------------------------------------
    if (inserted.length > 0) {
      await supabase
        .from('measuremates')
        .update({ last_data_received_at: timestamp })
        .eq('id', measuremate.id)
    }

    // ------------------------------------------------------------------
    // 7. Return a summary
    // ------------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        device_id: payload.end_device_ids.device_id,
        dev_eui: devEui,
        measuremate: measuremate.name,
        timestamp,
        inserted: inserted.length,
        readings: inserted,
        skipped,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('TTN webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
