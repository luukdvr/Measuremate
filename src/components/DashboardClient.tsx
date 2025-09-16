'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Sensor, Measuremate } from '@/types/database'
import { useRouter } from 'next/navigation'
import SensorForm from './SensorForm'
import SensorCard from './SensorCard'
import MeasuremateSelector from './MeasuremateSelector'

interface DashboardClientProps {
  user: User
  initialSensors: Sensor[]
}

export default function DashboardClient({ user, initialSensors }: DashboardClientProps) {
  const [selectedMeasuremate, setSelectedMeasuremate] = useState<Measuremate | null>(null)
  const [sensors, setSensors] = useState<Sensor[]>(initialSensors)
  const [filteredSensors, setFilteredSensors] = useState<Sensor[]>([])
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Filter sensors wanneer Measuremate verandert
  useEffect(() => {
    if (selectedMeasuremate) {
      const filtered = sensors.filter(sensor => sensor.measuremate_id === selectedMeasuremate.id)
      setFilteredSensors(filtered)
    } else {
      setFilteredSensors([])
    }
  }, [selectedMeasuremate, sensors])

  // Laad alle sensors opnieuw wanneer er een nieuwe Measuremate wordt geselecteerd
  useEffect(() => {
    if (selectedMeasuremate) {
      loadSensorsForMeasuremate(selectedMeasuremate.id)
    }
  }, [selectedMeasuremate])

  const loadSensorsForMeasuremate = async (measuremateId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensors')
        .select('*')
        .eq('measuremate_id', measuremateId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Update alleen de sensors voor deze Measuremate
      setSensors(prev => {
        const otherSensors = prev.filter(s => s.measuremate_id !== measuremateId)
        return [...otherSensors, ...(data || [])]
      })
    } catch (error) {
      console.error('Error loading sensors for measuremate:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  const handleMeasuremateSelect = (measuremate: Measuremate) => {
    setSelectedMeasuremate(measuremate)
    setShowForm(false) // Sluit eventuele open forms
  }

  const handleSensorAdded = (newSensor: Sensor) => {
    setSensors(prev => [newSensor, ...prev])
    setShowForm(false)
  }

  const handleSensorDeleted = (sensorId: string) => {
    setSensors(prev => prev.filter(sensor => sensor.id !== sensorId))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Measuremate Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welkom, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Measuremate Selector */}
          <MeasuremateSelector
            user={user}
            selectedMeasuremateName={selectedMeasuremate?.name}
            onMeasuremateSelect={handleMeasuremateSelect}
          />

          {/* Sensors sectie - alleen tonen als een Measuremate is geselecteerd */}
          {selectedMeasuremate && (
            <>
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Sensoren in {selectedMeasuremate.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredSensors.length} sensor{filteredSensors.length !== 1 ? 'en' : ''}
                    {selectedMeasuremate.location && ` • ${selectedMeasuremate.location}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Nieuwe Sensor
                </button>
              </div>

              {/* Add Sensor Form */}
              {showForm && (
                <div className="mb-6">
                  <SensorForm
                    measuremateId={selectedMeasuremate.id}
                    onSensorAdded={handleSensorAdded}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              )}

              {/* Sensors Grid */}
              {filteredSensors.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Nog geen sensoren in {selectedMeasuremate.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Voeg je eerste sensor toe om data te gaan verzamelen voor deze Measuremate.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Eerste Sensor Toevoegen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSensors.map((sensor) => (
                    <SensorCard
                      key={sensor.id}
                      sensor={sensor}
                      onDelete={handleSensorDeleted}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Instructies wanneer geen Measuremate is geselecteerd */}
          {!selectedMeasuremate && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H9m12 0a2 2 0 01-2 2H5a2 2 0 01-2-2m0 0v-2a2 2 0 012-2h14a2 2 0 012 2v2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Selecteer een Measuremate
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Kies een Measuremate hierboven om de bijbehorende sensoren te bekijken.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
