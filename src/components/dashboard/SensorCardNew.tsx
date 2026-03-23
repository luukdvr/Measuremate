'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sensor, SensorData, ManualMeasurement } from '@/types/database'
import SensorChart from '@/components/SensorChart'
import { cn } from '@/lib/utils'
import {
  Settings,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Bell,
  Activity,
  Plus,
  X,
} from 'lucide-react'

interface SensorCardNewProps {
  sensor: Sensor
  onDelete: (sensorId: string) => void
}

export default function SensorCardNew({ sensor, onDelete }: SensorCardNewProps) {
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [yMax, setYMax] = useState<number | undefined>(sensor.scale ?? undefined)
  const [yMin, setYMin] = useState<number | undefined>(sensor.scaleMin ?? undefined)
  const [timeRange, setTimeRange] = useState<string>(sensor.tijdScale || '60m')
  const [alertThreshold, setAlertThreshold] = useState<number | undefined>(sensor.alert_threshold ?? undefined)
  const [alertLowerThreshold, setAlertLowerThreshold] = useState<number | undefined>(sensor.alert_lower_threshold ?? undefined)
  const [copied, setCopied] = useState(false)
  const [manualData, setManualData] = useState<ManualMeasurement[]>([])
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [manualTimestamp, setManualTimestamp] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [savingManual, setSavingManual] = useState(false)
  const supabase = createClient()
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<{ timeRange: string, timestamp: number } | null>(null)

  const getDataLimit = (range: string) => {
    switch (range) {
      case '1m': return 100
      case '5m': return 100
      case '60m': return 200
      case '1d': return 500
      case '1w': return 1000
      case '1M': return 2000
      default: return 200
    }
  }

  const debouncedAddData = useCallback((newData: SensorData) => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current)
    updateTimerRef.current = setTimeout(() => {
      const limit = getDataLimit(timeRange)
      setSensorData(prev => {
        if (prev.some(item => item.id === newData.id)) return prev
        return [newData, ...prev].slice(0, limit)
      })
    }, 100)
  }, [timeRange])

  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current)
    }
  }, [])

  const fetchSensorData = useCallback(async () => {
    const now = Date.now()
    if (lastFetchRef.current && lastFetchRef.current.timeRange === timeRange && (now - lastFetchRef.current.timestamp) < 30000) return

    const limit = getDataLimit(timeRange)
    try {
      const { data } = await supabase
        .from('sensor_data')
        .select('id, sensor_id, user_id, timestamp, value, created_at')
        .eq('sensor_id', sensor.id)
        .order('timestamp', { ascending: false })
        .limit(limit)
      setSensorData(data || [])
      lastFetchRef.current = { timeRange, timestamp: now }
    } catch (error) {
      console.error('Error fetching sensor data:', error)
    } finally {
      setLoading(false)
    }
  }, [sensor.id, supabase, timeRange])

  const fetchManualData = useCallback(async () => {
    const { data } = await supabase
      .from('manual_measurements')
      .select('id, sensor_id, user_id, value, timestamp, notes, created_at')
      .eq('sensor_id', sensor.id)
      .order('timestamp', { ascending: false })
      .limit(200)
    setManualData(data || [])
  }, [sensor.id, supabase])

  useEffect(() => {
    fetchSensorData()
    fetchManualData()
    const subscription = supabase
      .channel(`sensor-data-${sensor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_data', filter: `sensor_id=eq.${sensor.id}` },
        (payload) => debouncedAddData(payload.new as SensorData))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sensor_data', filter: `sensor_id=eq.${sensor.id}` },
        (payload) => {
          if (!payload.old?.id) fetchSensorData()
          else setSensorData(prev => prev.filter(d => d.id !== payload.old.id))
        })
      .subscribe()
    return () => { subscription.unsubscribe() }
  }, [sensor.id, timeRange, fetchSensorData, fetchManualData, debouncedAddData, supabase])

  const handleDelete = async () => {
    if (!confirm(`Weet je zeker dat je sensor "${sensor.name}" wilt verwijderen?`)) return
    setDeleting(true)
    try {
      await supabase.from('sensor_data').delete().eq('sensor_id', sensor.id)
      const { error } = await supabase.from('sensors').delete().eq('id', sensor.id)
      if (!error) onDelete(sensor.id)
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleResetData = async () => {
    if (!confirm(`Alle data van "${sensor.name}" verwijderen? Dit kan niet ongedaan worden!`)) return
    setResetting(true)
    try {
      await supabase.from('sensor_data').delete().eq('sensor_id', sensor.id)
      setSensorData([])
      await fetchSensorData()
    } catch (error) {
      console.error('Error resetting:', error)
    } finally {
      setResetting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportCSV = () => {
    const sorted = [...sensorData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const csv = ['timestamp,value', ...sorted.map(d => `${d.timestamp},${d.value}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sensor.name.replace(/\s+/g, '_')}_data.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveManual = async () => {
    if (!manualValue) return
    setSavingManual(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('manual_measurements').insert({
        sensor_id: sensor.id,
        user_id: user.id,
        value: parseFloat(manualValue),
        timestamp: manualTimestamp ? new Date(manualTimestamp).toISOString() : new Date().toISOString(),
        notes: manualNotes || null,
      })
      if (!error) {
        setManualValue('')
        setManualTimestamp('')
        setManualNotes('')
        setShowManualForm(false)
        await fetchManualData()
      }
    } catch (err) {
      console.error('Error saving manual measurement:', err)
    } finally {
      setSavingManual(false)
    }
  }

  const updateSensorField = async (field: string, value: number | string | null) => {
    await supabase.from('sensors').update({ [field]: value }).eq('id', sensor.id)
  }

  const latestValue = sensorData[0]?.value
  const dataCount = sensorData.length

  const timeRanges = [
    { value: '1m', label: '1min' },
    { value: '5m', label: '5min' },
    { value: '60m', label: '1u' },
    { value: '1d', label: '24u' },
    { value: '1w', label: '7d' },
    { value: '1M', label: '30d' },
  ]

  // Alert status
  const isAboveThreshold = alertThreshold !== undefined && latestValue !== undefined && latestValue >= alertThreshold
  const isBelowThreshold = alertLowerThreshold !== undefined && latestValue !== undefined && latestValue <= alertLowerThreshold
  const hasAlert = isAboveThreshold || isBelowThreshold

  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 rounded-xl border transition-all',
      hasAlert
        ? 'border-red-200 dark:border-red-800'
        : 'border-slate-200 dark:border-slate-700'
    )}>
      {/* Main card - always visible */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              hasAlert ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
            )}>
              <Activity className={cn('w-5 h-5', hasAlert ? 'text-red-500' : 'text-blue-600 dark:text-blue-400')} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{sensor.name}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {sensor.unit && <span>{sensor.unit}</span>}
                {sensor.sensor_type && <span>• {sensor.sensor_type}</span>}
                <span>• {dataCount} metingen</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showManualForm
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Handmatige meting toevoegen"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={dataCount === 0}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showSettings
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Instellingen"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={expanded ? 'Inklappen' : 'Uitklappen'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Latest value + mini time range selector */}
        <div className="flex items-end justify-between mb-4">
          <div>
            {latestValue !== undefined ? (
              <div className={cn('text-3xl font-bold', hasAlert ? 'text-red-600' : 'text-slate-900 dark:text-white')}>
                {latestValue.toFixed(2)}
                {sensor.unit && <span className="text-lg font-normal text-slate-400 ml-1">{sensor.unit}</span>}
              </div>
            ) : (
              <div className="text-xl text-slate-400">Geen data</div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {timeRanges.map(tr => (
              <button
                key={tr.value}
                onClick={async () => {
                  setTimeRange(tr.value)
                  lastFetchRef.current = null
                  await updateSensorField('tijdScale', tr.value)
                }}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                  timeRange === tr.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alert banners */}
        {isAboveThreshold && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 flex-shrink-0" />
            <span>Bovengrens overschreden — drempel: {alertThreshold}, waarde: {latestValue?.toFixed(2)}</span>
          </div>
        )}
        {isBelowThreshold && (
          <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 flex-shrink-0" />
            <span>Ondergrens onderschreden — drempel: {alertLowerThreshold}, waarde: {latestValue?.toFixed(2)}</span>
          </div>
        )}

        {/* Manual measurement form */}
        {showManualForm && (
          <div className="mb-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Handmatige meting toevoegen</h4>
              <button onClick={() => setShowManualForm(false)} className="text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Waarde *"
                value={manualValue}
                onChange={e => setManualValue(e.target.value)}
                className="px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="datetime-local"
                value={manualTimestamp}
                onChange={e => setManualTimestamp(e.target.value)}
                className="px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Notitie (optioneel)"
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
                className="px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleSaveManual}
              disabled={!manualValue || savingManual}
              className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {savingManual ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        )}

        {/* Chart */}
        <div className={cn('transition-all', expanded ? 'h-80' : 'h-48')}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          ) : (
            <SensorChart
              data={aggregateForRange(sensorData, timeRange)}
              yMax={yMax}
              yMin={yMin}
              xFormat={xFormatForRange(timeRange)}
              thresholdUpper={alertThreshold}
              thresholdLower={alertLowerThreshold}
              manualData={manualData.map(m => ({ timestamp: m.timestamp, value: m.value, notes: m.notes }))}
            />
          )}
        </div>
      </div>

      {/* Settings Panel (slide-down) */}
      {showSettings && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl space-y-6">
          {/* Y-axis settings */}
          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Grafiek Instellingen</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Min Y-as</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Auto"
                  value={yMin ?? ''}
                  onChange={e => setYMin(e.target.value === '' ? undefined : Number(e.target.value))}
                  onBlur={() => updateSensorField('scaleMin', yMin ?? null)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Max Y-as</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Auto"
                  value={yMax ?? ''}
                  onChange={e => setYMax(e.target.value === '' ? undefined : Number(e.target.value))}
                  onBlur={() => updateSensorField('scale', yMax ?? null)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Alert ≥</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Geen"
                  value={alertThreshold ?? ''}
                  onChange={e => setAlertThreshold(e.target.value === '' ? undefined : Number(e.target.value))}
                  onBlur={() => updateSensorField('alert_threshold', alertThreshold ?? null)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Alert ≤</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Geen"
                  value={alertLowerThreshold ?? ''}
                  onChange={e => setAlertLowerThreshold(e.target.value === '' ? undefined : Number(e.target.value))}
                  onBlur={() => updateSensorField('alert_lower_threshold', alertLowerThreshold ?? null)}
                />
              </div>
            </div>
          </div>

          {/* API Key */}
          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">API Configuratie</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Endpoint</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono">
                    POST /api/sensor-data
                  </code>
                  <button
                    onClick={() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : ''
                      copyToClipboard(`${origin}/api/sensor-data`)
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono truncate">
                    {showApiKey ? sensor.api_key : '••••••••-••••-••••-••••-••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(sensor.api_key)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {copied && <p className="text-xs text-green-600">Gekopieerd!</p>}
              <details className="mt-2">
                <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                  Gebruik voorbeeld (curl)
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/sensor-data \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${sensor.api_key}" \\
  -d '{"value": 23.5}'`}
                </pre>
              </details>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-red-600 mb-3">Danger Zone</h4>
            <div className="flex gap-2">
              <button
                onClick={handleResetData}
                disabled={resetting || dataCount === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-orange-600 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-30 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {resetting ? 'Resetten...' : 'Alle Data Resetten'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Verwijderen...' : 'Sensor Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Data aggregation helpers (same logic as original)
type AggPoint = { timestamp: string; value: number | null }

function aggregateForRange(data: SensorData[], range: string): AggPoint[] {
  if (!data.length) return []
  const now = Date.now()
  let windowMs = 60 * 60 * 1000
  let buckets = 30
  let bucketMs = windowMs / buckets

  switch (range) {
    case '1m': windowMs = 60 * 1000; buckets = 30; bucketMs = 2 * 1000; break
    case '5m': windowMs = 5 * 60 * 1000; buckets = 30; bucketMs = 10 * 1000; break
    case '60m': windowMs = 60 * 60 * 1000; buckets = 60; bucketMs = 60 * 1000; break
    case '1d': windowMs = 24 * 60 * 60 * 1000; buckets = 48; bucketMs = 30 * 60 * 1000; break
    case '1w': windowMs = 7 * 24 * 60 * 60 * 1000; buckets = 28; bucketMs = 6 * 60 * 60 * 1000; break
    case '1M': windowMs = 30 * 24 * 60 * 60 * 1000; buckets = 30; bucketMs = 24 * 60 * 60 * 1000; break
  }

  const start = now - windowMs
  const lastTimes = new Array<number | null>(buckets).fill(null)
  const lastValues = new Array<number | null>(buckets).fill(null)

  for (const d of data) {
    const t = new Date(d.timestamp).getTime()
    if (t < start || t > now) continue
    const idx = Math.min(buckets - 1, Math.floor((t - start) / bucketMs))
    if (lastTimes[idx] === null || t >= (lastTimes[idx] as number)) {
      lastTimes[idx] = t
      lastValues[idx] = d.value
    }
  }

  return Array.from({ length: buckets }, (_, i) => ({
    timestamp: new Date(start + i * bucketMs + bucketMs / 2).toISOString(),
    value: lastValues[i],
  }))
}

function xFormatForRange(range: string): string {
  switch (range) {
    case '1m': case '5m': return 'HH:mm:ss'
    case '60m': case '1d': return 'HH:mm'
    case '1w': return 'dd/MM HH:mm'
    case '1M': return 'dd/MM'
    default: return 'HH:mm:ss'
  }
}
