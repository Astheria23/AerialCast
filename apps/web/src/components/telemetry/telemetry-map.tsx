'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { MissionGeofenceRef, MissionWaypoint } from '@/types/missions.types';
import type { TelemetryPoint } from '@/types/telemetry.types';
import { cn } from '@/lib/utils';

interface TelemetryMapProps {
  waypoints?: MissionWaypoint[];
  trail: TelemetryPoint[];
  latestPoint?: TelemetryPoint;
  geofences?: MissionGeofenceRef[];
  className?: string;
}

export interface TelemetryMapHandle {
  getElement: () => HTMLDivElement | null;
  waitForTiles: (timeoutMs?: number) => Promise<void>;
  captureAsDataUrl: (options?: { timeoutMs?: number }) => Promise<string | null>;
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

const MapHandleBridge = ({ onReady }: { onReady: (map: L.Map) => void }) => {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
};

export const TelemetryMap = forwardRef<TelemetryMapHandle, TelemetryMapProps>(function TelemetryMap(
  { waypoints = [], trail, latestPoint, geofences = [], className }: TelemetryMapProps,
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const waitForTiles = useCallback((timeoutMs = 6000) => {
    const layer = tileLayerRef.current as (L.TileLayer & { _tilesToLoad?: number }) | null;
    if (!layer) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        layer.off('load', handleLoad);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const checkTiles = () => {
        const remaining = typeof layer._tilesToLoad === 'number' ? layer._tilesToLoad : 0;
        if (remaining === 0) {
          cleanup();
          resolve();
        }
      };

      const handleLoad = () => {
        // Slight delay to ensure Leaflet updates internal counters before checking.
        setTimeout(checkTiles, 50);
      };

      layer.on('load', handleLoad);
      checkTiles();

      timeoutId = setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);
    });
  }, []);

  const captureAsDataUrl = useCallback(
    async ({ timeoutMs }: { timeoutMs?: number } = {}) => {
      await waitForTiles(timeoutMs);
      const map = mapInstanceRef.current;
      if (!map) {
        return null;
      }

      try {
        const leafletImageModule = await import('leaflet-image');
        const leafletImage = (leafletImageModule.default ?? leafletImageModule) as unknown as (
          map: L.Map,
          callback: (error: Error | null, canvas: HTMLCanvasElement | null) => void
        ) => void;

        const dataUrl = await new Promise<string>((resolve, reject) => {
          leafletImage(map, (error, canvas) => {
            if (error || !canvas) {
              reject(error ?? new Error('Failed to render leaflet canvas'));
              return;
            }
            resolve(canvas.toDataURL('image/png'));
          });
        });

        return dataUrl;
      } catch (error) {
        console.warn('Failed to capture Leaflet map via leaflet-image', error);
        return null;
      }
    },
    [waitForTiles]
  );

  useImperativeHandle(
    ref,
    () => ({
      getElement: () => containerRef.current,
      waitForTiles,
      captureAsDataUrl,
    }),
    [captureAsDataUrl, waitForTiles]
  );

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
    <div ref={containerRef} className={cn('h-full w-full rounded-xl border shadow-sm', className)}>
      <MapContainer
        center={center}
        zoom={autoFitPaths.length ? 14 : 5}
        scrollWheelZoom
        className="h-full w-full rounded-xl"
        preferCanvas
      >
        <MapHandleBridge onReady={handleMapReady} />
        <TileLayer
          ref={tileLayerRef}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &amp; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
          crossOrigin="anonymous"
          detectRetina
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
        {livePath.length > 1 && (
          <Polyline positions={livePath} pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.85 }} />
        )}
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
                {typeof latestPoint.rssi === 'number' && <p>RSSI {latestPoint.rssi} dBm</p>}
                {typeof latestPoint.snr === 'number' && <p>SNR {latestPoint.snr.toFixed(1)} dB</p>}
              </div>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
});
