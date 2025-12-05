"use client"

import { useMemo } from "react"
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface WaypointCoordinate {
  latitude: number
  longitude: number
  order: number
}

interface MissionWaypointsMapProps {
  waypoints: WaypointCoordinate[]
  onMapClick: (coords: { lat: number; lng: number }) => void
}

type TupleLatLng = [number, number]

const DEFAULT_CENTER: TupleLatLng = [-6.2, 106.8167]

const MapClickHandler = ({ onMapClick }: { onMapClick: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng)
    },
  })
  return null
}

const createWaypointIcon = (label: number) =>
  L.divIcon({
    html: `<div style="background:#2563eb;color:white;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.75rem;">${label}</div>`,
    className: "waypoint-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

export default function MissionWaypointsMap({ waypoints, onMapClick }: MissionWaypointsMapProps) {
  const positions = useMemo(() => waypoints.map((wp) => [wp.latitude, wp.longitude] as TupleLatLng), [waypoints])

  const center = useMemo<TupleLatLng>(() => {
    if (!positions.length) return DEFAULT_CENTER
    const [latSum, lngSum] = positions.reduce(
      (acc, [lat, lng]) => {
        acc[0] += lat
        acc[1] += lng
        return acc
      },
      [0, 0]
    )
    return [latSum / positions.length, lngSum / positions.length]
  }, [positions])

  return (
  <MapContainer center={center as LatLngExpression} zoom={positions.length ? 14 : 6} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {waypoints.map((wp) => (
        <Marker key={`${wp.latitude}-${wp.longitude}-${wp.order}`} position={[wp.latitude, wp.longitude]} icon={createWaypointIcon(wp.order)} />
      ))}
      {positions.length > 1 && <Polyline positions={positions} color="#2563eb" weight={3} opacity={0.9} />}
    </MapContainer>
  )
}
