import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testApiKey = searchParams.get('api_key')
    
    const supabase = await createClient()
    
    if (testApiKey) {
      // Test specific API key
      const { data: sensor, error } = await supabase
        .from('sensors')
        .select('id, user_id, name, api_key')
        .eq('api_key', testApiKey)
        .single()
      
      return NextResponse.json({
        test_api_key: testApiKey,
        found: !!sensor,
        error: error?.message,
        sensor: sensor || null,
        timestamp: new Date().toISOString()
      })
    } else {
      // List all sensors with their API keys
      const { data: sensors, error } = await supabase
        .from('sensors')
        .select('id, user_id, name, api_key, created_at')
        .order('created_at', { ascending: false })
      
      return NextResponse.json({
        sensors: sensors || [],
        error: error?.message,
        count: sensors?.length || 0,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check sensors',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
