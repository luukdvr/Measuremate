'use client'

import { useState, useEffect } from 'react'
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
  const supabase = createClient()

  const fetchSensorData = async () => {
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
  }

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
  }, [sensor.id, supabase])

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
    const endpoint = `${window.location.origin}/api/sensor-data`
    navigator.clipboard.writeText(endpoint)
    alert('Endpoint URL gekopieerd naar klembord!')
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

        {/* Chart */}
        <div className="mb-4 h-48">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Laden...</div>
            </div>
          ) : (
            <SensorChart data={sensorData} />
          )}
        </div>

        {/* API Information */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">API Configuratie</h4>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Endpoint:</label>
              <div className="flex items-center">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 mr-2">
                  POST /api/sensor-data
                </code>
                <button
                  onClick={copyEndpoint}
                  className="text-xs text-indigo-600 hover:text-indigo-500"
                >
                  Kopiëren
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700">API Key:</label>
              <div className="flex items-center">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 mr-2">
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
                  className="text-xs text-indigo-600 hover:text-indigo-500"
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
{`curl -X POST ${window.location.origin}/api/sensor-data \\
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
