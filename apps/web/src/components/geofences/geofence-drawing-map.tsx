"use client"

import { useMemo } from "react"
import { MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface GeofenceDrawingMapProps {
  points: { latitude: number; longitude: number; order: number }[]
  onMapClick?: (coords: { lat: number; lng: number }) => void
}

const DEFAULT_CENTER: LatLngExpression = [-6.2, 106.8167]

const MapClickHandler = ({ onMapClick }: { onMapClick?: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng)
    },
  })
  return null
}

const createPointIcon = (label: number) =>
  L.divIcon({
    html: `<div style="background:#1d4ed8;color:white;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.7rem;">${label}</div>`,
    className: "geofence-point-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

export default function GeofenceDrawingMap({ points, onMapClick }: GeofenceDrawingMapProps) {
  const orderedPoints = useMemo(() => [...points].sort((a, b) => a.order - b.order), [points])
  const polygonPositions = orderedPoints.map((point) => [point.latitude, point.longitude] as [number, number])

  const center = useMemo(() => {
    if (!polygonPositions.length) {
      return DEFAULT_CENTER
    }
    const latSum = polygonPositions.reduce((sum, [lat]) => sum + lat, 0)
    const lngSum = polygonPositions.reduce((sum, [, lng]) => sum + lng, 0)
    return [latSum / polygonPositions.length, lngSum / polygonPositions.length] as LatLngExpression
  }, [polygonPositions])

  return (
    <MapContainer center={center} zoom={polygonPositions.length ? 14 : 5} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {polygonPositions.length >= 2 && <Polyline positions={polygonPositions as LatLngExpression[]} color="#2563eb" weight={2} dashArray="6 6" />}
      {polygonPositions.length >= 3 && (
        <Polygon
          positions={polygonPositions as LatLngExpression[]}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.2, weight: 2 }}
        />
      )}
      {orderedPoints.map((point) => (
        <Marker key={`${point.latitude}-${point.longitude}-${point.order}`} position={[point.latitude, point.longitude]} icon={createPointIcon(point.order)}>
          <Tooltip direction="top" offset={[0, -12]} opacity={0.9}>{`Point #${point.order}`}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}
