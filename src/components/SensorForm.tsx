'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sensor } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

interface SensorFormProps {
  onSensorAdded: (sensor: Sensor) => void
  onCancel: () => void
}

export default function SensorForm({ onSensorAdded, onCancel }: SensorFormProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Gebruiker niet gevonden')
        setLoading(false)
        return
      }

      const apiKey = uuidv4()

      const { data, error: insertError } = await supabase
        .from('sensors')
        .insert({
          user_id: user.id,
          name: name.trim(),
          api_key: apiKey,
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
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Nieuwe Sensor Toevoegen</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sensorName" className="block text-sm font-medium text-gray-700">
            Sensor Naam
          </label>
          <input
            type="text"
            id="sensorName"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Bijv. Temperatuur Woonkamer"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Toevoegen...' : 'Sensor Toevoegen'}
          </button>
        </div>
      </form>
    </div>
  )
}
