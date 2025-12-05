"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet"
import type { LatLngExpression, LatLngTuple } from "leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import type { Geofence } from "@/types/geofences.types"

interface GeofenceMapProps {
  geofences: Geofence[]
  selectedId?: string | null
  onSelect?: (geofenceId: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  SAFE_ZONE: "#10b981",
  NO_FLY_ZONE: "#ef4444",
}

const DEFAULT_CENTER: LatLngExpression = [-6.2, 106.8167]

interface PolygonDefinition {
  id: string
  positions: LatLngTuple[]
  color: string
  label: string
}

const AutoFitBounds = ({ polygons }: { polygons: LatLngTuple[][] }) => {
  const map = useMap()

  useEffect(() => {
    if (!polygons.length) return
    const bounds = polygons.reduce((acc, polygon) => acc.extend(polygon), L.latLngBounds(polygons[0]))
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15))
    }
  }, [map, polygons])

  return null
}

export function GeofenceMap({ geofences, selectedId, onSelect }: GeofenceMapProps) {
  const polygons = useMemo<PolygonDefinition[]>(() => {
    return geofences
      .filter((geofence) => geofence.points.length >= 3)
      .map((geofence) => {
        const ordered = [...geofence.points].sort((a, b) => a.order - b.order)
        const positions = ordered.map((point) => [point.latitude, point.longitude] as LatLngTuple)
        const color = TYPE_COLORS[geofence.type] ?? "#2563eb"
        return {
          id: geofence.geofence_id,
          positions,
          color,
          label: geofence.area_name,
        }
      })
  }, [geofences])

  const hasPolygons = polygons.length > 0

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={hasPolygons ? 12 : 5}
      scrollWheelZoom
      className="h-full w-full rounded-xl border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasPolygons && <AutoFitBounds polygons={polygons.map((polygon) => polygon.positions)} />}
      {polygons.map((polygon) => (
        <Polygon
          key={polygon.id}
          positions={polygon.positions as LatLngExpression[]}
          pathOptions={{
            color: polygon.color,
            fillColor: polygon.color,
            fillOpacity: selectedId === polygon.id ? 0.4 : 0.2,
            weight: selectedId === polygon.id ? 3 : 2,
          }}
          eventHandlers={{
            click: () => onSelect?.(polygon.id),
          }}
        >
          <Tooltip direction="top" sticky>
            <div className="space-y-1">
              <p className="font-semibold">{polygon.label}</p>
              <p className="text-xs text-muted-foreground">{polygon.positions.length} point(s)</p>
            </div>
          </Tooltip>
        </Polygon>
      ))}
    </MapContainer>
  )
}
