import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_RECORDS = 100_000

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sensorId = searchParams.get('sensor_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const format = searchParams.get('format') || 'csv'
    const limitParam = searchParams.get('limit')

    if (!sensorId) {
      return NextResponse.json({ error: 'sensor_id is required' }, { status: 400 })
    }

    if (format !== 'csv' && format !== 'json') {
      return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 })
    }

    // Verify user owns this sensor
    const { data: sensor, error: sensorError } = await supabase
      .from('sensors')
      .select('id, name, unit, sensor_type, measuremate_id')
      .eq('id', sensorId)
      .single()

    if (sensorError || !sensor) {
      return NextResponse.json({ error: 'Sensor not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('sensor_data')
      .select('value, timestamp')
      .eq('sensor_id', sensorId)
      .order('timestamp', { ascending: true })

    if (from) {
      query = query.gte('timestamp', new Date(from).toISOString())
    }
    if (to) {
      query = query.lte('timestamp', new Date(to).toISOString())
    }

    const limit = limitParam ? Math.min(parseInt(limitParam), MAX_RECORDS) : MAX_RECORDS
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Export query error:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    if (format === 'json') {
      return NextResponse.json({
        sensor: {
          id: sensor.id,
          name: sensor.name,
          unit: sensor.unit,
          type: sensor.sensor_type,
        },
        count: data?.length ?? 0,
        data: data ?? [],
      })
    }

    // CSV format
    const header = 'timestamp,value'
    const rows = (data ?? []).map(
      (row) => `${row.timestamp},${row.value}`
    )
    const csv = [header, ...rows].join('\n')

    const filename = `${sensor.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
