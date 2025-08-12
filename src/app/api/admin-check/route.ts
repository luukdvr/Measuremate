import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Gebruik service role key voor admin toegang
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Check alle sensors (admin view)
    const { data: allSensors, error: allError } = await supabaseAdmin
      .from('sensors')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Check sensor met jouw API key
    const testApiKey = 'a131a412-72ea-42cd-892d-32b58cc138fd'
    const { data: specificSensor, error: specificError } = await supabaseAdmin
      .from('sensors')
      .select('*')
      .eq('api_key', testApiKey)
      .single()
    
    return NextResponse.json({
      message: 'Admin database check',
      all_sensors: {
        count: allSensors?.length || 0,
        data: allSensors || [],
        error: allError?.message
      },
      test_api_key: {
        key: testApiKey,
        found: !!specificSensor,
        data: specificSensor || null,
        error: specificError?.message
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Admin check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
