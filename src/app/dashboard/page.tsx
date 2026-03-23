'use client'

import { useState } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardShell'
import { getNodeStatus, statusConfig, type Measuremate, type NewMeasuremate } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Plus,
  MapPin,
  Clock,
  Cpu,
  Trash2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function DashboardOverview() {
  const { user, measuremates, setSelectedMeasuremate, refreshMeasuremates } = useDashboard()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', location: '', latitude: '', longitude: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Auto-open create form if ?new=true
  const shouldShowNew = searchParams.get('new') === 'true'
  if (shouldShowNew && !showCreateForm) {
    setShowCreateForm(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setCreating(true)

    try {
      const newMeasuremate: NewMeasuremate = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }

      const { data, error } = await supabase
        .from('measuremates')
        .insert([newMeasuremate])
        .select()
        .single()

      if (error) throw error

      await refreshMeasuremates()
      setFormData({ name: '', description: '', location: '', latitude: '', longitude: '' })
      setShowCreateForm(false)

      if (data) {
        setSelectedMeasuremate(data)
        router.push(`/dashboard/measuremate/${data.id}`)
      }
    } catch (error) {
      console.error('Error creating measuremate:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (m: Measuremate, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Weet je zeker dat je "${m.name}" wilt verwijderen?\nDit verwijdert ook ALLE sensors en data.`)) return

    setDeletingId(m.id)
    try {
      const { error } = await supabase
        .from('measuremates')
        .delete()
        .eq('id', m.id)
        .eq('user_id', user.id)
      if (error) throw error
      await refreshMeasuremates()
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeletingId(null)
    }
  }

  // Count statuses
  const statusCounts = measuremates.reduce((acc, m) => {
    const status = getNodeStatus(m.last_data_received_at)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Status Summary Cards */}
      {measuremates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">Totaal</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{measuremates.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-1 text-sm text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Online
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.online || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Waarschuwing
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{statusCounts.warning || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-1 text-sm text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Offline
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{(statusCounts.offline || 0) + (statusCounts.unknown || 0)}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Measuremates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Beheer je apparaten en bekijk sensordata
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe Measuremate
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Nieuwe Measuremate aanmaken
          </h3>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Naam *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Vijver Noord"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Locatie
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Blijdorp, Rotterdam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Beschrijving
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Korte beschrijving"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={e => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="51.9270"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={e => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4.4470"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !formData.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? 'Aanmaken...' : 'Measuremate Aanmaken'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); router.replace('/dashboard') }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Measuremate Cards */}
      {measuremates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {measuremates.map(m => {
            const status = getNodeStatus(m.last_data_received_at)
            const config = statusConfig[status]

            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMeasuremate(m)
                  router.push(`/dashboard/measuremate/${m.id}`)
                }}
                className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bgColor)}>
                      <Cpu className={cn('w-5 h-5', config.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {m.name}
                      </h3>
                      <div className={cn('flex items-center gap-1 text-xs', config.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
                        {config.label}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(m, e)}
                    disabled={deletingId === m.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {m.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                    {m.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                  {m.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {m.location}
                    </span>
                  )}
                  {m.last_data_received_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(m.last_data_received_at), { addSuffix: true, locale: nl })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : !showCreateForm ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <Cpu className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Welkom bij Measuremate!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Maak je eerste Measuremate aan om te beginnen met het monitoren van je sensoren.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Eerste Measuremate Aanmaken
          </button>
        </div>
      ) : null}
    </div>
  )
}
