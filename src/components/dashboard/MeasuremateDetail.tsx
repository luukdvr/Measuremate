'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { Sensor, getNodeStatus, statusConfig } from '@/types/database'
import { cn } from '@/lib/utils'
import SensorCardNew from '../../components/dashboard/SensorCardNew'
import SensorForm from '../../components/dashboard/SensorFormNew'
import {
  Plus,
  MapPin,
  Clock,
  Edit3,
  Save,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface MeasuremateDetailProps {
  measuremateId: string
}

export default function MeasuremateDetail({ measuremateId }: MeasuremateDetailProps) {
  const { user, measuremates, setSelectedMeasuremate, refreshMeasuremates } = useDashboard()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({ name: '', description: '', location: '', latitude: '', longitude: '' })
  const supabase = createClient()

  const measuremate = measuremates.find(m => m.id === measuremateId)

  // Set as selected
  useEffect(() => {
    if (measuremate) {
      setSelectedMeasuremate(measuremate)
    }
  }, [measuremate, setSelectedMeasuremate])

  const loadSensors = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sensors')
      .select('*')
      .eq('measuremate_id', measuremateId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSensors(data || [])
    setLoading(false)
  }, [supabase, measuremateId, user.id])

  useEffect(() => {
    loadSensors()
  }, [loadSensors])

  const handleSensorAdded = (sensor: Sensor) => {
    setSensors(prev => [sensor, ...prev])
    setShowForm(false)
  }

  const handleSensorDeleted = (sensorId: string) => {
    setSensors(prev => prev.filter(s => s.id !== sensorId))
  }

  const handleStartEdit = () => {
    if (!measuremate) return
    setEditData({
      name: measuremate.name,
      description: measuremate.description || '',
      location: measuremate.location || '',
      latitude: measuremate.latitude?.toString() || '',
      longitude: measuremate.longitude?.toString() || '',
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!measuremate) return
    await supabase
      .from('measuremates')
      .update({
        name: editData.name,
        description: editData.description || null,
        location: editData.location || null,
        latitude: editData.latitude ? parseFloat(editData.latitude) : null,
        longitude: editData.longitude ? parseFloat(editData.longitude) : null,
      })
      .eq('id', measuremate.id)
    setEditing(false)
    await refreshMeasuremates()
  }

  if (!measuremate) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 dark:text-slate-400">Measuremate niet gevonden.</p>
      </div>
    )
  }

  const status = getNodeStatus(measuremate.last_data_received_at)
  const config = statusConfig[status]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Naam</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Locatie</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={e => setEditData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Beschrijving</label>
                <input
                  type="text"
                  value={editData.description}
                  onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editData.latitude}
                    onChange={e => setEditData(prev => ({ ...prev, latitude: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editData.longitude}
                    onChange={e => setEditData(prev => ({ ...prev, longitude: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                <Save className="w-4 h-4" /> Opslaan
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-lg">
                <X className="w-4 h-4" /> Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {measuremate.name}
                </h2>
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                {measuremate.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {measuremate.location}
                  </span>
                )}
                {measuremate.latitude && measuremate.longitude && (
                  <span className="text-xs">
                    {measuremate.latitude.toFixed(4)}, {measuremate.longitude.toFixed(4)}
                  </span>
                )}
                {measuremate.last_data_received_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Laatste data: {formatDistanceToNow(new Date(measuremate.last_data_received_at), { addSuffix: true, locale: nl })}
                  </span>
                )}
              </div>
              {measuremate.description && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{measuremate.description}</p>
              )}
            </div>
            <button
              onClick={handleStartEdit}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Bewerken"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Sensors Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Sensoren ({sensors.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Sensor Toevoegen
        </button>
      </div>

      {/* Add Sensor Form */}
      {showForm && (
        <SensorForm
          measuremateId={measuremateId}
          onSensorAdded={handleSensorAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Sensor Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-3" />
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/6 mb-4" />
              <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Nog geen sensoren in {measuremate.name}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" /> Eerste Sensor Toevoegen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sensors.map(sensor => (
            <SensorCardNew
              key={sensor.id}
              sensor={sensor}
              onDelete={handleSensorDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
