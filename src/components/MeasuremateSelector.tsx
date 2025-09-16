'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Measuremate, NewMeasuremate } from '@/types/database'
import { User } from '@supabase/supabase-js'

interface MeasuremateSelectorProps {
  user: User
  selectedMeasuremateName?: string
  onMeasuremateSelect: (measuremate: Measuremate) => void
}

export default function MeasuremateSelector({ user, selectedMeasuremateName, onMeasuremateSelect }: MeasuremateSelectorProps) {
  const [measuremates, setMeasuremates] = useState<Measuremate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const supabase = createClient()

  // Form state voor nieuwe Measuremate
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: ''
  })

  const loadMeasuremates = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('measuremates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setMeasuremates(data || [])
      
      // Auto-selecteer de eerste Measuremate als er geen geselecteerd is
      if (data && data.length > 0 && !selectedMeasuremateName) {
        onMeasuremateSelect(data[0])
      }
    } catch (error) {
      console.error('Error loading measuremates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadMeasuremates()
    }
  }, [user, selectedMeasuremateName, onMeasuremateSelect])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.name.trim()) return

    setCreateLoading(true)
    try {
      const newMeasuremate: NewMeasuremate = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null
      }

      const { data, error } = await supabase
        .from('measuremates')
        .insert([newMeasuremate])
        .select()
        .single()

      if (error) throw error

      // Voeg toe aan de lijst en selecteer direct
      setMeasuremates(prev => [data, ...prev])
      onMeasuremateSelect(data)
      
      // Reset form
      setFormData({ name: '', description: '', location: '' })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating measuremate:', error)
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Measuremates
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          + Nieuwe Measuremate
        </button>
      </div>

      {/* Lijst van bestaande Measuremates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {measuremates.map((measuremate) => (
          <div
            key={measuremate.id}
            onClick={() => onMeasuremateSelect(measuremate)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMeasuremateName === measuremate.name
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              {measuremate.name}
            </h3>
            {measuremate.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {measuremate.description}
              </p>
            )}
            {measuremate.location && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {measuremate.location}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Naam *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Bijv. Thuis, Kantoor, Kas 1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Locatie
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Bijv. Amsterdam, Schuur"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschrijving
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Korte beschrijving"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createLoading || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-lg transition-colors"
              >
                {createLoading ? 'Bezig...' : 'Aanmaken'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {measuremates.length === 0 && !showCreateForm && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-2">Nog geen Measuremates aangemaakt.</p>
          <p className="text-sm">Klik op &quot;Nieuwe Measuremate&quot; om te beginnen.</p>
        </div>
      )}
    </div>
  )
}