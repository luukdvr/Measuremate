import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SensorWithMeasuremate {
  id: string
  name: string
  user_id: string
  measuremate_id: string
  alert_threshold: number | null
  alert_lower_threshold: number | null
  measuremates: {
    name: string
  }[]
}

// Helper function to check thresholds and send notifications
async function checkThresholdsAndNotify(sensor: SensorWithMeasuremate, currentValue: number) {
  console.log('🎯 ENTERED checkThresholdsAndNotify function')
  
  try {
    // Only check if thresholds are set
    const upperThreshold = sensor.alert_threshold
    const lowerThreshold = sensor.alert_lower_threshold
    
    console.log('📊 Threshold values:', { 
      upper: upperThreshold, 
      lower: lowerThreshold, 
      current: currentValue,
      upperType: typeof upperThreshold,
      currentType: typeof currentValue 
    })
    
    if (!upperThreshold && !lowerThreshold) {
      console.log('⚠️ No thresholds set - exiting')
      return // No thresholds set
    }

    let notificationType: string | null = null
    let thresholdValue: number | null = null

    // Check upper threshold
    if (upperThreshold && currentValue > upperThreshold) {
      notificationType = 'upper'
      thresholdValue = upperThreshold
    }
    // Check lower threshold
    else if (lowerThreshold && currentValue < lowerThreshold) {
      notificationType = 'lower' 
      thresholdValue = lowerThreshold
    }

    if (!notificationType || !thresholdValue) {
      return // No threshold exceeded
    }

    // Get user email
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: user } = await supabaseService.auth.admin.getUserById(sensor.user_id)
    
    if (!user?.user?.email) {
      console.error('No email found for user:', sensor.user_id)
      return
    }

    // Send notification via internal API
    const notificationPayload = {
      userId: sensor.user_id,
      sensorId: sensor.id,
      sensorName: sensor.name,
      measuremateName: sensor.measuremates?.[0]?.name,
      currentValue,
      thresholdValue,
      thresholdType: notificationType,
      userEmail: user.user.email
    }

    const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!notificationResponse.ok) {
      const error = await notificationResponse.text()
      console.error('Notification send failed:', error)
    }

  } catch (error) {
    console.error('Error in threshold check:', error)
    // Don't throw - notification failure shouldn't break sensor data insert
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the API key from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Parse request body
    const body = await request.json()
    const { value, timestamp } = body

    // Validate required fields
    if (typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Value must be a number' },
        { status: 400 }
      )
    }

    // Use service role for API key verification (bypass RLS)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Find sensor by API key using service role (include threshold settings)
    const { data: sensor, error: sensorError } = await supabaseService
      .from('sensors')
      .select(`
        id, user_id, name, measuremate_id,
        alert_threshold, alert_lower_threshold,
        measuremates(name)
      `)
      .eq('api_key', apiKey)
      .single()

    if (sensorError || !sensor) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Use provided timestamp or current time
    const recordTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()

    // Insert sensor data using service role
    const { data: sensorData, error: insertError } = await supabaseService
      .from('sensor_data')
      .insert({
        sensor_id: sensor.id,
        user_id: sensor.user_id,
        value: value,
        timestamp: recordTimestamp,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save sensor data' },
        { status: 500 }
      )
    }

    // Check thresholds and trigger notifications if needed
    console.log('🧪 About to check thresholds for:', {
      sensorName: sensor.name,
      value,
      upperThreshold: sensor.alert_threshold,
      lowerThreshold: sensor.alert_lower_threshold
    })
    
    await checkThresholdsAndNotify(sensor, value)

    return NextResponse.json({
      success: true,
      data: {
        id: sensorData.id,
        sensor_id: sensor.id,
        sensor_name: sensor.name,
        value: value,
        timestamp: recordTimestamp,
      },
      debugInfo: {
        thresholdCheck: 'Function called',
        upperThreshold: sensor.alert_threshold,
        lowerThreshold: sensor.alert_lower_threshold,
        currentValue: value,
        thresholdExceeded: value > (sensor.alert_threshold || 999)
      }
    }, { status: 201 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method to fetch sensor data (optional, for debugging)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sensorId = searchParams.get('sensor_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!sensorId) {
      return NextResponse.json(
        { error: 'sensor_id parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('sensor_id', sensorId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
