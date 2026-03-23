'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Measuremate, getNodeStatus, statusConfig } from '@/types/database'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface MapViewProps {
  measuremates: Measuremate[]
  onSelectMeasuremate: (m: Measuremate) => void
}

const statusColors: Record<string, string> = {
  online: '#22c55e',
  warning: '#f59e0b',
  offline: '#ef4444',
  unknown: '#9ca3af',
}

export default function MapView({ measuremates, onSelectMeasuremate }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Calculate center from measuremates
    const lats = measuremates.map(m => m.latitude!).filter(Boolean)
    const lngs = measuremates.map(m => m.longitude!).filter(Boolean)
    const centerLat = lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : 52.0
    const centerLng = lngs.length > 0 ? lngs.reduce((a, b) => a + b, 0) / lngs.length : 5.0

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: lats.length > 1 ? 10 : 13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Add markers
    const markers: L.Marker[] = []
    measuremates.forEach(m => {
      if (!m.latitude || !m.longitude) return

      const status = getNodeStatus(m.last_data_received_at)
      const color = statusColors[status]
      const config = statusConfig[status]

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: ${color}; border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const lastUpdate = m.last_data_received_at
        ? formatDistanceToNow(new Date(m.last_data_received_at), { addSuffix: true, locale: nl })
        : 'Nooit'

      const marker = L.marker([m.latitude, m.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui; min-width: 180px;">
            <h3 style="margin: 0 0 4px; font-weight: 600; font-size: 14px;">${m.name}</h3>
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
              <span style="font-size: 12px; color: #666;">${config.label}</span>
            </div>
            ${m.location ? `<p style="margin: 0 0 4px; font-size: 12px; color: #888;">${m.location}</p>` : ''}
            <p style="margin: 0; font-size: 11px; color: #999;">Laatste data: ${lastUpdate}</p>
            <button onclick="window.__mmSelectMeasuremate__('${m.id}')" 
              style="margin-top: 8px; padding: 4px 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
              Details bekijken
            </button>
          </div>
        `)

      markers.push(marker)
    })

    // Fit bounds
    if (markers.length > 1) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.1))
    }

    mapInstanceRef.current = map

    // Global click handler for popup button
    ;(window as unknown as Record<string, unknown>).__mmSelectMeasuremate__ = (id: string) => {
      const m = measuremates.find(mm => mm.id === id)
      if (m) {
        onSelectMeasuremate(m)
        router.push(`/dashboard/measuremate/${m.id}`)
      }
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
      delete (window as unknown as Record<string, unknown>).__mmSelectMeasuremate__
    }
  }, [measuremates, onSelectMeasuremate, router])

  return <div ref={mapRef} className="w-full h-full" />
}
