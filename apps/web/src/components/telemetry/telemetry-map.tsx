'use client';

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { MissionGeofenceRef, MissionWaypoint } from '@/types/missions.types';
import type { TelemetryPoint } from '@/types/telemetry.types';

interface TelemetryMapProps {
  waypoints?: MissionWaypoint[];
  trail: TelemetryPoint[];
  latestPoint?: TelemetryPoint;
  geofences?: MissionGeofenceRef[];
}

const DEFAULT_CENTER: LatLngExpression = [-6.2, 106.8167];

const AutoFit = ({ paths }: { paths: LatLngTuple[][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!paths.length) return;
    const coordinates = paths.flat();
    if (!coordinates.length) return;
    const bounds = coordinates.reduce(
      (acc, point) => acc.extend(point),
      L.latLngBounds(coordinates[0], coordinates[0])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2));
    }
  }, [map, paths]);

  return null;
};

const toPolyline = (points: Array<{ latitude: number; longitude: number }>): LatLngTuple[] =>
  points.map((point) => [point.latitude, point.longitude] as LatLngTuple);

const sortWaypoints = (waypoints: MissionWaypoint[]): MissionWaypoint[] =>
  [...waypoints].sort((a, b) => a.order - b.order);

const sortGeofencePoints = (points: NonNullable<MissionGeofenceRef['points']>) =>
  [...points].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const getGeofenceStyle = (type?: string) => {
  const normalized = type?.toUpperCase();
  if (normalized === 'NO_FLY_ZONE') {
    return { color: '#dc2626', fillColor: '#fca5a5', fillOpacity: 0.35, weight: 2, dashArray: '4 6' };
  }
  return { color: '#0ea5e9', fillColor: '#bae6fd', fillOpacity: 0.25, weight: 2 };
};

export function TelemetryMap({ waypoints = [], trail, latestPoint, geofences = [] }: TelemetryMapProps) {
  const plannedPath = useMemo(() => toPolyline(sortWaypoints(waypoints)), [waypoints]);
  const livePath = useMemo(
    () =>
      trail
        .filter((point) => typeof point.latitude === 'number' && typeof point.longitude === 'number')
        .map((point) => [point.latitude, point.longitude] as LatLngTuple),
    [trail]
  );

  const geofencePolygons = useMemo(
    () =>
      geofences
        .map((geofence) => {
          if (!geofence.points || geofence.points.length === 0) {
            return null;
          }
          const positions = toPolyline(sortGeofencePoints(geofence.points));
          if (!positions.length) {
            return null;
          }
          return {
            id: geofence.geofence_id,
            name: geofence.area_name,
            type: geofence.type,
            positions,
            style: getGeofenceStyle(typeof geofence.type === 'string' ? geofence.type : undefined),
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          name: string;
          type: string;
          positions: LatLngTuple[];
          style: L.PathOptions;
        }>,
    [geofences]
  );

  const geofencePaths = useMemo(() => geofencePolygons.map((polygon) => polygon.positions), [geofencePolygons]);
  const center = livePath.at(-1) || plannedPath[0] || geofencePolygons[0]?.positions[0] || DEFAULT_CENTER;
  const linePaths = useMemo(() => [plannedPath, livePath].filter((path) => path.length > 1), [livePath, plannedPath]);
  const autoFitPaths = useMemo(
    () => [...linePaths, ...geofencePaths].filter((path) => path.length > 1),
    [geofencePaths, linePaths]
  );

  return (
    <MapContainer center={center} zoom={autoFitPaths.length ? 14 : 5} scrollWheelZoom className="h-full w-full rounded-xl border">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {autoFitPaths.length > 0 && <AutoFit paths={autoFitPaths} />}
      {geofencePolygons.map((polygon) => (
        <Polygon key={polygon.id} positions={polygon.positions} pathOptions={polygon.style}>
          <Tooltip direction="top" sticky>
            <div className="space-y-1 text-xs">
              <p className="font-semibold">{polygon.name}</p>
              <p>{polygon.type.replace(/_/g, ' ')}</p>
            </div>
          </Tooltip>
        </Polygon>
      ))}
      {plannedPath.length > 1 && (
        <Polyline positions={plannedPath} pathOptions={{ color: '#6366f1', dashArray: '8 6', weight: 3, opacity: 0.8 }} />
      )}
      {livePath.length > 1 && <Polyline positions={livePath} pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.85 }} />}
      {plannedPath[0] && (
        <CircleMarker center={plannedPath[0]} pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8' }} radius={5}>
          <Tooltip direction="right">Planned start</Tooltip>
        </CircleMarker>
      )}
      {plannedPath.at(-1) && (
        <CircleMarker center={plannedPath.at(-1)!} pathOptions={{ color: '#f97316', fillColor: '#f97316' }} radius={5}>
          <Tooltip direction="left">Planned finish</Tooltip>
        </CircleMarker>
      )}
      {latestPoint && (
        <CircleMarker
          center={[latestPoint.latitude, latestPoint.longitude] as LatLngTuple}
          radius={7}
          pathOptions={{ color: '#22c55e', fillColor: '#15803d', fillOpacity: 0.9 }}
        >
          <Tooltip direction="top">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Live position</p>
              <p>
                {latestPoint.latitude.toFixed(4)}, {latestPoint.longitude.toFixed(4)}
              </p>
              {typeof latestPoint.altitude === 'number' && <p>Altitude {latestPoint.altitude.toFixed(1)} m</p>}
            </div>
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
