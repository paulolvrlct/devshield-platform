import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>'

export default function AttackMap({ points = [] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: false
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!markersRef.current) return

    markersRef.current.clearLayers()

    for (const point of points) {
      if (!point.latitude || !point.longitude) continue

      const size = Math.min(Math.max(point.count * 2, 6), 30)

      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: size,
        fillColor: '#00D4FF',
        fillOpacity: 0.6,
        color: '#00D4FF',
        weight: 1,
        opacity: 0.8
      })

      marker.bindPopup(
        `<div style="font-size:13px;line-height:1.6">
          <strong>${point.src_ip}</strong><br/>
          ${point.city || ''}, ${point.country || ''}<br/>
          <span style="color:#00D4FF">${point.count} attaque(s)</span>
        </div>`,
        { className: 'honeypot-popup' }
      )

      markersRef.current.addLayer(marker)
    }
  }, [points])

  return (
    <>
      <style>{`
        .honeypot-popup .leaflet-popup-content-wrapper {
          background: #0A1628;
          color: #E2E8F0;
          border: 1px solid rgba(0,212,255,0.3);
          border-radius: 8px;
        }
        .honeypot-popup .leaflet-popup-tip {
          background: #0A1628;
        }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
