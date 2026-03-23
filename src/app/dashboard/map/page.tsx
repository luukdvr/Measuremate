'use client'

import { useDashboard } from '@/components/dashboard/DashboardShell'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

// Dynamic import to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('../../../components/dashboard/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-10rem)] bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
      <p className="text-slate-400">Kaart laden...</p>
    </div>
  ),
})

export default function MapPage() {
  const { measuremates, setSelectedMeasuremate } = useDashboard()
  
  const withLocation = measuremates.filter(m => m.latitude && m.longitude)
  const withoutLocation = measuremates.filter(m => !m.latitude || !m.longitude)

  return (
    <div className="space-y-4">
      {withoutLocation.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {withoutLocation.length} Measuremate{withoutLocation.length > 1 ? 's' : ''} zonder locatie: 
            <span className="font-medium"> {withoutLocation.map(m => m.name).join(', ')}</span>.
            Stel een locatie in om ze op de kaart te tonen.
          </p>
        </div>
      )}

      {withLocation.length > 0 ? (
        <div className="h-[calc(100vh-10rem)] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <MapView measuremates={withLocation} onSelectMeasuremate={setSelectedMeasuremate} />
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Geen Measuremates met locatie
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Voeg latitude en longitude toe aan je Measuremates om ze op de kaart te zien.
          </p>
        </div>
      )}
    </div>
  )
}
