import { NextRequest, NextResponse } from 'next/server'

interface BatchItem {
  value: number
  timestamp?: string
}

const MAX_BATCH_SIZE = 100

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7)
    const body = await request.json()

    if (!Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json(
        { error: 'body.data must be a non-empty array' },
        { status: 400 }
      )
    }

    if (body.data.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} items per batch` },
        { status: 400 }
      )
    }

    // Validate all items
    for (let i = 0; i < body.data.length; i++) {
      const item = body.data[i] as BatchItem
      if (typeof item.value !== 'number') {
        return NextResponse.json(
          { error: `Item ${i}: value must be a number` },
          { status: 400 }
        )
      }
    }

    // Service client for API key auth
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // Verify sensor by API key
    const { data: sensor, error: sensorError } = await supabaseService
      .from('sensors')
      .select('id, user_id, measuremate_id')
      .eq('api_key', apiKey)
      .single()

    if (sensorError || !sensor) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Prepare rows
    const now = new Date().toISOString()
    const rows = (body.data as BatchItem[]).map((item) => ({
      sensor_id: sensor.id,
      user_id: sensor.user_id,
      value: item.value,
      timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : now,
    }))

    // Bulk insert
    const { data: inserted, error: insertError } = await supabaseService
      .from('sensor_data')
      .insert(rows)
      .select('id, value, timestamp')

    if (insertError) {
      console.error('Batch insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save batch data' },
        { status: 500 }
      )
    }

    // Update measuremate timestamp
    await supabaseService
      .from('measuremates')
      .update({ last_data_received_at: now })
      .eq('id', sensor.measuremate_id)

    return NextResponse.json({
      success: true,
      inserted: inserted?.length ?? 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Batch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
