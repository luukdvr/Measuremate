'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Sensor } from '@/types/database'
import { useRouter } from 'next/navigation'
import SensorForm from './SensorForm'
import SensorCard from './SensorCard'

interface DashboardClientProps {
  user: User
  initialSensors: Sensor[]
}

export default function DashboardClient({ user, initialSensors }: DashboardClientProps) {
  const [sensors, setSensors] = useState<Sensor[]>(initialSensors)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  const handleSensorAdded = (newSensor: Sensor) => {
    setSensors(prev => [newSensor, ...prev])
    setShowForm(false)
  }

  const handleSensorDeleted = (sensorId: string) => {
    setSensors(prev => prev.filter(sensor => sensor.id !== sensorId))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Pulsaqua dataplatform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welkom, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
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
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Mijn Sensoren ({sensors.length})
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Nieuwe Sensor
            </button>
          </div>

          {/* Add Sensor Form */}
          {showForm && (
            <div className="mb-6">
              <SensorForm
                onSensorAdded={handleSensorAdded}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {/* Sensors Grid */}
          {sensors.length === 0 ? (
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nog geen sensoren</h3>
              <p className="mt-1 text-sm text-gray-500">
                Voeg je eerste sensor toe om data te gaan verzamelen.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Eerste Sensor Toevoegen
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sensors.map((sensor) => (
                <SensorCard
                  key={sensor.id}
                  sensor={sensor}
                  onDelete={handleSensorDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
