'use client';

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { MissionWaypoint } from '@/types/missions.types';
import type { TelemetryPoint } from '@/types/telemetry.types';

interface TelemetryMapProps {
  waypoints?: MissionWaypoint[];
  trail: TelemetryPoint[];
  latestPoint?: TelemetryPoint;
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

export function TelemetryMap({ waypoints = [], trail, latestPoint }: TelemetryMapProps) {
  const plannedPath = useMemo(() => toPolyline(sortWaypoints(waypoints)), [waypoints]);
  const livePath = useMemo(
    () =>
      trail
        .filter((point) => typeof point.latitude === 'number' && typeof point.longitude === 'number')
        .map((point) => [point.latitude, point.longitude] as LatLngTuple),
    [trail]
  );

  const center = livePath.at(-1) || plannedPath[0] || DEFAULT_CENTER;
  const paths = useMemo(() => [plannedPath, livePath].filter((path) => path.length > 1), [livePath, plannedPath]);

  return (
    <MapContainer center={center} zoom={paths.length ? 14 : 5} scrollWheelZoom className="h-full w-full rounded-xl border">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {paths.length > 0 && <AutoFit paths={paths} />}
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
