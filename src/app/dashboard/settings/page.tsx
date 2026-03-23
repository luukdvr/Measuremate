'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { Sensor } from '@/types/database'
import { Key, User, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

export default function SettingsPage() {
  const { user, measuremates } = useDashboard()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const supabase = createClient()

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const regenerateApiKey = async (sensorId: string) => {
    if (!confirm('Weet je zeker dat je de API key wilt regenereren?\nJe device zal een nieuwe key nodig hebben.')) return
    setRegenerating(sensorId)
    const newKey = uuidv4()
    await supabase.from('sensors').update({ api_key: newKey }).eq('id', sensorId)
    setSensors(prev => prev.map(s => s.id === sensorId ? { ...s, api_key: newKey } : s))
    setRegenerating(null)
  }

  // Group sensors by measuremate
  const sensorsByMeasuremate = sensors.reduce((acc, sensor) => {
    const mm = measuremates.find(m => m.id === sensor.measuremate_id)
    const name = mm?.name || 'Onbekend'
    if (!acc[name]) acc[name] = []
    acc[name].push(sensor)
    return acc
  }, {} as Record<string, Sensor[]>)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Instellingen</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Beheer je account en API keys</p>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <p className="text-sm text-slate-900 dark:text-white font-medium">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Account ID</label>
            <code className="text-xs text-slate-500 font-mono">{user.id}</code>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Measuremates</label>
            <p className="text-sm text-slate-900 dark:text-white">{measuremates.length}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Sensoren</label>
            <p className="text-sm text-slate-900 dark:text-white">{sensors.length}</p>
          </div>
        </div>
      </div>

      {/* API Keys Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API Keys</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Elke sensor heeft een unieke API key waarmee je device data kan sturen.
        </p>

        {Object.entries(sensorsByMeasuremate).map(([mmName, mmSensors]) => (
          <div key={mmName} className="mb-6 last:mb-0">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{mmName}</h4>
            <div className="space-y-2">
              {mmSensors.map(sensor => (
                <div
                  key={sensor.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{sensor.name}</p>
                    <code className="text-xs text-slate-500 font-mono">
                      {showKeys[sensor.id] ? sensor.api_key : '••••••••-••••-••••-••••-••••••••••••'}
                    </code>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, [sensor.id]: !prev[sensor.id] }))}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-700"
                      title={showKeys[sensor.id] ? 'Verbergen' : 'Tonen'}
                    >
                      {showKeys[sensor.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(sensor.api_key, sensor.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-700"
                      title="Kopiëren"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => regenerateApiKey(sensor.id)}
                      disabled={regenerating === sensor.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-30"
                      title="Regenereren"
                    >
                      <RefreshCw className={cn('w-4 h-4', regenerating === sensor.id && 'animate-spin')} />
                    </button>
                  </div>
                  {copied === sensor.id && (
                    <span className="text-xs text-green-600">Gekopieerd!</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {sensors.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Nog geen sensoren aangemaakt.</p>
        )}
      </div>
    </div>
  )
}
