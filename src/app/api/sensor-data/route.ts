import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // Find sensor by API key using service role
    const { data: sensor, error: sensorError } = await supabaseService
      .from('sensors')
      .select('id, user_id, name')
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

    return NextResponse.json({
      success: true,
      data: {
        id: sensorData.id,
        sensor_id: sensor.id,
        sensor_name: sensor.name,
        value: value,
        timestamp: recordTimestamp,
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
