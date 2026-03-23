'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { Sensor, SensorData } from '@/types/database'
// SensorChart used via ComparisonChart below
import { cn } from '@/lib/utils'
import { GitCompareArrows, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const COLORS = [
  'rgb(59, 130, 246)',   // blue
  'rgb(16, 185, 129)',   // green
  'rgb(245, 158, 11)',   // amber
  'rgb(239, 68, 68)',    // red
  'rgb(139, 92, 246)',   // purple
  'rgb(236, 72, 153)',   // pink
]

export default function ComparePage() {
  const { user, measuremates } = useDashboard()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([])
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData[]>>({})
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Load all sensors
  useEffect(() => {
    const loadSensors = async () => {
      const { data } = await supabase
        .from('sensors')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
      setSensors(data || [])
    }
    loadSensors()
  }, [supabase, user.id])

  const getTimeRangeMs = (range: string) => {
    switch (range) {
      case '1h': return 60 * 60 * 1000
      case '24h': return 24 * 60 * 60 * 1000
      case '7d': return 7 * 24 * 60 * 60 * 1000
      case '30d': return 30 * 24 * 60 * 60 * 1000
      default: return 24 * 60 * 60 * 1000
    }
  }

  // Fetch data for selected sensors
  const fetchData = useCallback(async () => {
    if (selectedSensorIds.length === 0) return
    setLoading(true)

    const windowMs = getTimeRangeMs(timeRange)
    const since = new Date(Date.now() - windowMs).toISOString()
    const newMap: Record<string, SensorData[]> = {}

    for (const sensorId of selectedSensorIds) {
      const { data } = await supabase
        .from('sensor_data')
        .select('id, sensor_id, user_id, timestamp, value, created_at')
        .eq('sensor_id', sensorId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true })
        .limit(2000)
      newMap[sensorId] = data || []
    }

    setSensorDataMap(newMap)
    setLoading(false)
  }, [selectedSensorIds, timeRange, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSensor = (sensorId: string) => {
    setSelectedSensorIds(prev => {
      if (prev.includes(sensorId)) {
        return prev.filter(id => id !== sensorId)
      }
      if (prev.length >= 6) return prev // max 6
      return [...prev, sensorId]
    })
  }

  // Group sensors by measuremate
  const sensorsByMeasuremate = sensors.reduce((acc, sensor) => {
    const mm = measuremates.find(m => m.id === sensor.measuremate_id)
    const name = mm?.name || 'Onbekend'
    if (!acc[name]) acc[name] = []
    acc[name].push(sensor)
    return acc
  }, {} as Record<string, Sensor[]>)

  // Build comparison chart data
  const buildChartData = () => {
    if (selectedSensorIds.length === 0) return null

    // Collect all timestamps
    const allTimestamps = new Set<string>()
    selectedSensorIds.forEach(id => {
      sensorDataMap[id]?.forEach(d => allTimestamps.add(d.timestamp))
    })

    const sorted = Array.from(allTimestamps).sort()
    if (sorted.length === 0) return null

    const labels = sorted.map(ts => format(new Date(ts), timeRange === '1h' ? 'HH:mm' : timeRange === '24h' ? 'HH:mm' : 'dd/MM HH:mm', { locale: nl }))

    const datasets = selectedSensorIds.map((sensorId, i) => {
      const sensor = sensors.find(s => s.id === sensorId)
      const data = sensorDataMap[sensorId] || []
      const mm = measuremates.find(m => m.id === sensor?.measuremate_id)

      // Map data to timestamps
      const dataMap = new Map(data.map(d => [d.timestamp, d.value]))
      const values = sorted.map(ts => dataMap.get(ts) ?? null)

      return {
        label: `${sensor?.name || 'Sensor'} (${mm?.name || ''})`,
        data: values,
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: `${COLORS[i % COLORS.length].replace(')', ', 0.1)')}`,
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: true,
      }
    })

    return { labels, datasets }
  }

  const chartData = buildChartData()

  const timeRanges = [
    { value: '1h', label: '1 uur' },
    { value: '24h', label: '24 uur' },
    { value: '7d', label: '7 dagen' },
    { value: '30d', label: '30 dagen' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vergelijken</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecteer tot 6 sensoren om naast elkaar te plotten
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          {timeRanges.map(tr => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                timeRange === tr.value
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sensor selector */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sticky top-20">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Sensoren ({selectedSensorIds.length}/6)
            </h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {Object.entries(sensorsByMeasuremate).map(([mmName, mmSensors]) => (
                <div key={mmName}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{mmName}</p>
                  <div className="space-y-1">
                    {mmSensors.map(sensor => {
                      const isSelected = selectedSensorIds.includes(sensor.id)
                      const colorIdx = selectedSensorIds.indexOf(sensor.id)
                      return (
                        <button
                          key={sensor.id}
                          onClick={() => toggleSensor(sensor.id)}
                          disabled={!isSelected && selectedSensorIds.length >= 6}
                          className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30'
                          )}
                        >
                          {isSelected ? (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: COLORS[colorIdx % COLORS.length] }}
                            />
                          ) : (
                            <Plus className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span className="truncate">{sensor.name}</span>
                          {sensor.unit && (
                            <span className="text-xs text-slate-400 ml-auto">{sensor.unit}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            {selectedSensorIds.length === 0 ? (
              <div className="text-center py-20">
                <GitCompareArrows className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Selecteer sensoren
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Kies 2 of meer sensoren links om ze te vergelijken
                </p>
              </div>
            ) : loading ? (
              <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : chartData ? (
              <div className="h-96">
                <ComparisonChart data={chartData} />
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                Geen data beschikbaar voor de geselecteerde periode
              </div>
            )}

            {/* Legend */}
            {selectedSensorIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {selectedSensorIds.map((id, i) => {
                  const sensor = sensors.find(s => s.id === id)
                  const mm = measuremates.find(m => m.id === sensor?.measuremate_id)
                  return (
                    <div key={id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span>{sensor?.name} ({mm?.name})</span>
                      <button onClick={() => toggleSensor(id)} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple comparison chart using Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend)

function ComparisonChart({ data }: { data: { labels: string[]; datasets: unknown[] } }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { maxTicksLimit: 20, font: { size: 10 } },
      },
      y: {
        display: true,
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      point: { radius: 0, hoverRadius: 4, hitRadius: 8 },
    },
  }

  return <Line data={data as Parameters<typeof Line>[0]['data']} options={options} />
}
