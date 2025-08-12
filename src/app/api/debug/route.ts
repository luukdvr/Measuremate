import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test database connection
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select('*')
      .limit(5)
    
    const { data: sensorData, error: dataError } = await supabase
      .from('sensor_data')
      .select('*')
      .limit(5)

    return NextResponse.json({
      status: 'Database connection test',
      tables: {
        sensors: {
          exists: !sensorsError,
          error: sensorsError?.message,
          count: sensors?.length || 0,
          data: sensors || []
        },
        sensor_data: {
          exists: !dataError,
          error: dataError?.message,
          count: sensorData?.length || 0,
          data: sensorData || []
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
