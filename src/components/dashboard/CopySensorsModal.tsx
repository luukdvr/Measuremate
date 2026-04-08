'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sensor, Measuremate } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { X, Copy, ChevronRight } from 'lucide-react'

interface CopySensorsModalProps {
  measuremateId: string
  measuremates: Measuremate[]
  userId: string
  onSensorsCopied: (sensors: Sensor[]) => void
  onClose: () => void
}

export default function CopySensorsModal({
  measuremateId,
  measuremates,
  userId,
  onSensorsCopied,
  onClose,
}: CopySensorsModalProps) {
  const [sourceMeasuremateId, setSourceMeasuremateId] = useState('')
  const [sourceSensors, setSourceSensors] = useState<Sensor[]>([])
  const [loadingSensors, setLoadingSensors] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const otherMeasuremates = measuremates.filter(m => m.id !== measuremateId)

  useEffect(() => {
    if (!sourceMeasuremateId) {
      setSourceSensors([])
      return
    }

    const loadSensors = async () => {
      setLoadingSensors(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('sensors')
        .select('*')
        .eq('measuremate_id', sourceMeasuremateId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setSourceSensors(data || [])
      }
      setLoadingSensors(false)
    }

    loadSensors()
  }, [sourceMeasuremateId, userId, supabase])

  const handleCopy = async () => {
    if (sourceSensors.length === 0) return
    setCopying(true)
    setError(null)

    try {
      const newSensors = sourceSensors.map(s => ({
        user_id: userId,
        measuremate_id: measuremateId,
        name: s.name,
        api_key: uuidv4(),
        scale: s.scale,
        scaleMin: s.scaleMin,
        unit: s.unit,
        sensor_type: s.sensor_type,
        alert_threshold: s.alert_threshold,
        alert_lower_threshold: s.alert_lower_threshold,
      }))

      const { data, error: insertError } = await supabase
        .from('sensors')
        .insert(newSensors)
        .select()

      if (insertError) {
        setError(insertError.message)
      } else if (data) {
        onSensorsCopied(data)
      }
    } catch {
      setError('Er is een onverwachte fout opgetreden')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sensoren Kopieren</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {otherMeasuremates.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Je hebt geen andere Measuremates om sensoren van te kopieren.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kopieer sensoren van
                </label>
                <select
                  value={sourceMeasuremateId}
                  onChange={e => setSourceMeasuremateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Kies een Measuremate...</option>
                  {otherMeasuremates.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.location ? ` (${m.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {loadingSensors && (
                <div className="py-4 text-center text-sm text-slate-400">Sensoren laden...</div>
              )}

              {!loadingSensors && sourceMeasuremateId && sourceSensors.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                  Deze Measuremate heeft geen sensoren.
                </p>
              )}

              {sourceSensors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {sourceSensors.length} sensor{sourceSensors.length !== 1 ? 'en' : ''} worden gekopieerd:
                  </p>
                  <div className="space-y-1.5">
                    {sourceSensors.map(s => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                      >
                        <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                        <span className="text-slate-400">
                          {s.sensor_type}{s.unit ? ` (${s.unit})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    Elke sensor krijgt een nieuwe API key. Drempelwaarden worden meegekopieerd.
                  </p>
                </div>
              )}
            </>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCopy}
            disabled={copying || sourceSensors.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copying ? 'Kopieren...' : `Kopieer ${sourceSensors.length > 0 ? sourceSensors.length + ' ' : ''}Sensoren`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}
