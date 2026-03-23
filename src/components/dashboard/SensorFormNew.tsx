'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sensor } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { X } from 'lucide-react'

interface SensorFormNewProps {
  measuremateId: string
  onSensorAdded: (sensor: Sensor) => void
  onCancel: () => void
}

const SENSOR_TYPES = [
  { value: 'temperature', label: 'Temperatuur', unit: '°C' },
  { value: 'ph', label: 'pH', unit: 'pH' },
  { value: 'ec', label: 'EC (Geleidbaarheid)', unit: 'µS/cm' },
  { value: 'humidity', label: 'Luchtvochtigheid', unit: '%' },
  { value: 'pressure', label: 'Druk', unit: 'hPa' },
  { value: 'flow', label: 'Debiet', unit: 'L/min' },
  { value: 'dissolved_oxygen', label: 'Opgeloste Zuurstof', unit: 'mg/L' },
  { value: 'turbidity', label: 'Troebelheid', unit: 'NTU' },
  { value: 'other', label: 'Anders', unit: '' },
]

export default function SensorFormNew({ measuremateId, onSensorAdded, onCancel }: SensorFormNewProps) {
  const [name, setName] = useState('')
  const [sensorType, setSensorType] = useState('')
  const [unit, setUnit] = useState('')
  const [scale, setScale] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleTypeChange = (type: string) => {
    setSensorType(type)
    const preset = SENSOR_TYPES.find(t => t.value === type)
    if (preset && preset.unit) setUnit(preset.unit)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Gebruiker niet gevonden')
        return
      }

      const apiKey = uuidv4()
      const scaleNumber = scale.trim() === '' ? null : Number(scale)

      const { data, error: insertError } = await supabase
        .from('sensors')
        .insert({
          user_id: user.id,
          measuremate_id: measuremateId,
          name: name.trim(),
          api_key: apiKey,
          scale: scaleNumber,
          unit: unit.trim(),
          sensor_type: sensorType,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
      } else if (data) {
        onSensorAdded(data)
      }
    } catch {
      setError('Er is een onverwachte fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nieuwe Sensor</h3>
        <button onClick={onCancel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sensor Naam *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bijv. pH Sensor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type
            </label>
            <select
              value={sensorType}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Kies een type...</option>
              {SENSOR_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Eenheid
            </label>
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bijv. °C, pH, µS/cm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Max Y-as (optioneel)
            </label>
            <input
              type="number"
              value={scale}
              onChange={e => setScale(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bijv. 100"
            />
          </div>
        </div>

        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Toevoegen...' : 'Sensor Toevoegen'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  )
}
