'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sensor, SensorData } from '@/types/database'
import SensorChart from './SensorChart'

interface SensorCardProps {
  sensor: Sensor
  onDelete: (sensorId: string) => void
}

export default function SensorCard({ sensor, onDelete }: SensorCardProps) {
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [loading, setLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [yMax, setYMax] = useState<number | undefined>(sensor.scale ?? undefined)
  const [yMin, setYMin] = useState<number | undefined>(sensor.scaleMin ?? undefined)
  const [timeRange, setTimeRange] = useState<string>(sensor.tijdScale || '60m')
  const [alertThreshold, setAlertThreshold] = useState<number | undefined>(sensor.alert_threshold ?? undefined)
  const [alertLowerThreshold, setAlertLowerThreshold] = useState<number | undefined>(sensor.alert_lower_threshold ?? undefined)
  const supabase = createClient()
  // Stable base URL for examples (same on server and client)
  const exampleBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  const fetchSensorData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('sensor_id', sensor.id)
        .order('timestamp', { ascending: false })
        .limit(50)

      setSensorData(data || [])
    } catch (error) {
      console.error('Error fetching sensor data:', error)
    } finally {
      setLoading(false)
    }
  }, [sensor.id, supabase])

  useEffect(() => {
    fetchSensorData()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`sensor-data-${sensor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
          filter: `sensor_id=eq.${sensor.id}`,
        },
        (payload) => {
          setSensorData(prev => [payload.new as SensorData, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [sensor.id, supabase, fetchSensorData])

  const handleDelete = async () => {
    if (!confirm(`Weet je zeker dat je sensor "${sensor.name}" wilt verwijderen? Dit verwijdert ook alle data.`)) {
      return
    }

    setDeleting(true)
    try {
      // Delete sensor data first
      await supabase
        .from('sensor_data')
        .delete()
        .eq('sensor_id', sensor.id)

      // Then delete sensor
      const { error } = await supabase
        .from('sensors')
        .delete()
        .eq('id', sensor.id)

      if (error) {
        alert('Fout bij verwijderen: ' + error.message)
      } else {
        onDelete(sensor.id)
      }
    } catch (error) {
      console.error('Error deleting sensor:', error)
      alert('Er is een fout opgetreden bij het verwijderen')
    } finally {
      setDeleting(false)
    }
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText(sensor.api_key)
    alert('API key gekopieerd naar klembord!')
  }

  const copyEndpoint = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '')
    const endpoint = origin ? `${origin}/api/sensor-data` : '/api/sensor-data'
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(endpoint)
      alert('Endpoint URL gekopieerd naar klembord!')
    }
  }

  const latestValue = sensorData[0]?.value
  const dataCount = sensorData.length

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {sensor.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {dataCount} metingen
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
          >
            {deleting ? 'Verwijderen...' : 'Verwijderen'}
          </button>
        </div>

        {/* Latest Value */}
        {latestValue !== undefined && (
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900">
              {latestValue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              Laatste waarde
            </div>
          </div>
        )}

        {/* Controls */}
  <div className="mb-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Max y-as</label>
            <input
              type="number"
              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="bv. 100"
              value={yMax ?? ''}
              onChange={(e) => setYMax(e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={async () => {
                const value = yMax ?? null
                await supabase.from('sensors').update({ scale: value }).eq('id', sensor.id)
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Min y-as</label>
            <input
              type="number"
              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="bv. 0"
              value={yMin ?? ''}
              onChange={(e) => setYMin(e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={async () => {
                const value = yMin ?? null
                await supabase.from('sensors').update({ scaleMin: value }).eq('id', sensor.id)
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Tijd</label>
            <select
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              value={timeRange}
              onChange={async (e) => {
                const v = e.target.value
                setTimeRange(v)
                await supabase.from('sensors').update({ tijdScale: v }).eq('id', sensor.id)
              }}
            >
              <option value="1m">1 min</option>
              <option value="5m">5 min</option>
              <option value="60m">60 min</option>
              <option value="1d">1 dag</option>
              <option value="1w">1 week</option>
              <option value="1M">1 maand</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Alert ≥</label>
            <input
              type="number"
              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="bv. 80"
              value={alertThreshold ?? ''}
              onChange={(e) => setAlertThreshold(e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={async () => {
                const value = alertThreshold ?? null
                await supabase.from('sensors').update({ alert_threshold: value }).eq('id', sensor.id)
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Alert ≤</label>
            <input
              type="number"
              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="bv. 10"
              value={alertLowerThreshold ?? ''}
              onChange={(e) => setAlertLowerThreshold(e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={async () => {
                const value = alertLowerThreshold ?? null
                await supabase.from('sensors').update({ alert_lower_threshold: value }).eq('id', sensor.id)
              }}
            />
          </div>
        </div>

        {/* Alert banner */}
        {alertThreshold !== undefined && latestValue !== undefined && latestValue >= alertThreshold && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="font-medium">Waarschuwing: bovengrens overschreden</span>
            </div>
            <p>Drempelwaarde: {alertThreshold} | Laatste waarde: {latestValue.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              Email notificatie wordt automatisch verzonden (max. 1 per 30 min)
            </div>
          </div>
        )}

        {alertLowerThreshold !== undefined && latestValue !== undefined && latestValue <= alertLowerThreshold && (
          <div className="mb-3 p-3 rounded bg-orange-50 border border-orange-200 text-orange-700 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <span className="font-medium">Waarschuwing: ondergrens onderschreden</span>
            </div>
            <p>Ondergrens: {alertLowerThreshold} | Laatste waarde: {latestValue.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              Email notificatie wordt automatisch verzonden (max. 1 per 30 min)
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mb-4 h-48">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Laden...</div>
            </div>
          ) : (
            <SensorChart 
              data={aggregateForRange(sensorData, timeRange)} 
              yMax={yMax}
              yMin={yMin}
              xFormat={xFormatForRange(timeRange)}
              thresholdUpper={alertThreshold}
              thresholdLower={alertLowerThreshold}
            />
          )}
        </div>

        {/* API Information */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">API Configuratie</h4>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Endpoint:</label>
              <div className="flex items-center">
                <code className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded flex-1 mr-2">
                  POST /api/sensor-data
                </code>
                <button
                  onClick={copyEndpoint}
                  className="text-xs text-gray-900 hover:text-gray-900"
                >
                  Kopiëren
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700">API Key:</label>
              <div className="flex items-center">
                <code className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded flex-1 mr-2">
                  {showApiKey ? sensor.api_key : '••••••••-••••-••••-••••-••••••••••••'}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-gray-600 hover:text-gray-500 mr-2"
                >
                  {showApiKey ? 'Verbergen' : 'Tonen'}
                </button>
                <button
                  onClick={copyApiKey}
                  className="text-xs text-gray-900 hover:text-gray-500"
                >
                  Kopiëren
                </button>
              </div>
            </div>
          </div>

          {/* Usage Example */}
          <details className="mt-3">
            <summary className="text-xs font-medium text-gray-700 cursor-pointer">
              Gebruik voorbeeld
            </summary>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
{`curl -X POST ${exampleBaseUrl ? exampleBaseUrl : ''}/api/sensor-data \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${sensor.api_key}" \\
  -d '{"value": 23.5}'`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}

// Helper: filter data by selected time range
type AggPoint = { timestamp: string; value: number | null }

function aggregateForRange(data: SensorData[], range: string): AggPoint[] {
  if (!data.length) return []
  const now = Date.now()
  // Define window length and buckets
  let windowMs = 60 * 60 * 1000
  let buckets = 30
  let bucketMs = windowMs / buckets

  switch (range) {
    case '1m':
      windowMs = 60 * 1000
      buckets = 30
      bucketMs = 2 * 1000 // 2s
      break
    case '5m':
      windowMs = 5 * 60 * 1000
      buckets = 30
      bucketMs = 10 * 1000 // 10s
      break
    case '60m':
      windowMs = 60 * 60 * 1000
      buckets = 60
      bucketMs = 60 * 1000 // 1m
      break
    case '1d':
      windowMs = 24 * 60 * 60 * 1000
      buckets = 48
      bucketMs = 30 * 60 * 1000 // 30m
      break
    case '1w':
      windowMs = 7 * 24 * 60 * 60 * 1000
      buckets = 28
      bucketMs = 6 * 60 * 60 * 1000 // 6h
      break
    case '1M':
      windowMs = 30 * 24 * 60 * 60 * 1000
      buckets = 30
      bucketMs = 24 * 60 * 60 * 1000 // 1d
      break
  }

  const start = now - windowMs
  // Track last (most recent) value per bucket
  const lastTimes = new Array<number | null>(buckets).fill(null)
  const lastValues = new Array<number | null>(buckets).fill(null)

  for (const d of data) {
    const t = new Date(d.timestamp).getTime()
    if (t < start || t > now) continue
    const idx = Math.min(
      buckets - 1,
      Math.floor((t - start) / bucketMs)
    )
    // choose the most recent value inside the bucket
    if (lastTimes[idx] === null || t >= (lastTimes[idx] as number)) {
      lastTimes[idx] = t
      lastValues[idx] = d.value
    }
  }

  // Build aggregated point list with bucket center timestamps
  const points: AggPoint[] = []
  for (let i = 0; i < buckets; i++) {
    const bucketStart = start + i * bucketMs
    const center = bucketStart + bucketMs / 2
    const value = lastValues[i] !== null ? (lastValues[i] as number) : null
    points.push({ timestamp: new Date(center).toISOString(), value })
  }

  return points
}

function xFormatForRange(range: string): string {
  switch (range) {
    case '1m':
      return 'HH:mm:ss'
    case '5m':
      return 'HH:mm:ss'
    case '60m':
      return 'HH:mm'
    case '1d':
      return 'HH:mm'
    case '1w':
      return 'dd/MM HH:mm'
    case '1M':
      return 'dd/MM'
    default:
      return 'HH:mm:ss'
  }
}
