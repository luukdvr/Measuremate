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

  const handleDelete = async (measuremateToDelete: Measuremate, e: React.MouseEvent) => {
    e.stopPropagation() // Voorkom dat de card wordt geselecteerd
    
    const confirmText = `Weet je zeker dat je "${measuremateToDelete.name}" wilt verwijderen?\n\nDit verwijdert ook ALLE sensors en sensor data in deze Measuremate!\n\nDeze actie kan niet ongedaan worden gemaakt.`
    
    if (!confirm(confirmText)) {
      return
    }

    setCreateLoading(true) // Hergebruik loading state voor feedback
    
    try {
      const { error } = await supabase
        .from('measuremates')
        .delete()
        .eq('id', measuremateToDelete.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Update lokale state
      const remainingMeasuremates = measuremates.filter(m => m.id !== measuremateToDelete.id)
      setMeasuremates(remainingMeasuremates)
      
      // Als de verwijderde Measuremate was geselecteerd, selecteer een andere of clear
      if (selectedMeasuremateName === measuremateToDelete.name) {
        if (remainingMeasuremates.length > 0) {
          onMeasuremateSelect(remainingMeasuremates[0])
        }
        // Als geen Measuremates meer over zijn, wordt er automatisch niets geselecteerd
      }
      
    } catch (error) {
      console.error('Error deleting measuremate:', error)
      alert('Er is een fout opgetreden bij het verwijderen van de Measuremate. Probeer het opnieuw.')
    } finally {
      setCreateLoading(false)
    }
  }

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
            className={`group relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMeasuremateName === measuremate.name
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {/* Delete knop */}
            <button
              onClick={(e) => handleDelete(measuremate, e)}
              disabled={createLoading}
              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:!opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title={createLoading ? 'Bezig met verwijderen...' : `Verwijder ${measuremate.name}`}
            >
              {createLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>

            <div className="pr-8">
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