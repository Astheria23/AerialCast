'use client';

import { BatteryCharging, Gauge, MapPin, Radio, Waves } from 'lucide-react';

import type { TelemetryPoint, TelemetryStatsSummary } from '@/types/telemetry.types';

interface TelemetryVitalsProps {
  stats: TelemetryStatsSummary;
  latestPoint?: TelemetryPoint;
}

const formatValue = (value?: number | null, suffix = '') => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(1)}${suffix}`;
};

const batteryPercentage = (voltage?: number | null) => {
  if (typeof voltage !== 'number') return null;
  const max = 12.6;
  const min = 10.4;
  const ratio = Math.max(0, Math.min(1, (voltage - min) / (max - min)));
  return Math.round(ratio * 100);
};

export function TelemetryVitals({ stats, latestPoint }: TelemetryVitalsProps) {
  const batteryPct = batteryPercentage(stats.battery.latest ?? latestPoint?.battery_voltage);

  const vitals = [
    {
      label: 'Battery',
      value: batteryPct !== null ? `${batteryPct}%` : formatValue(stats.battery.latest, ' V'),
      subValue: stats.battery.latest ? `${stats.battery.latest.toFixed(2)} V` : undefined,
      icon: BatteryCharging,
    },
    {
      label: 'Altitude',
      value: formatValue(stats.altitude.latest, ' m'),
      subValue:
        stats.altitude.min !== null && stats.altitude.max !== null
          ? `${stats.altitude.min?.toFixed(0)}–${stats.altitude.max?.toFixed(0)} m`
          : undefined,
      icon: MapPin,
    },
    {
      label: 'Speed',
      value: formatValue(stats.speed.latest, ' m/s'),
      subValue: stats.distance_meters ? `${(stats.distance_meters / 1000).toFixed(2)} km traveled` : undefined,
      icon: Gauge,
    },
    {
      label: 'Signal',
      value: formatValue(stats.signal.latest, ' dBm'),
      subValue: stats.signal.min !== null ? `min ${stats.signal.min?.toFixed(0)} dBm` : undefined,
      icon: Radio,
    },
    {
      label: 'SNR',
      value: formatValue(stats.snr.latest, ' dB'),
      subValue: stats.snr.average !== null ? `avg ${stats.snr.average?.toFixed(1)} dB` : undefined,
      icon: Waves,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {vitals.map((vital) => {
        const Icon = vital.icon;
        return (
          <div key={vital.label} className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{vital.label}</p>
              <p className="text-2xl font-semibold">{vital.value}</p>
              {vital.subValue && <p className="text-xs text-muted-foreground">{vital.subValue}</p>}
            </div>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
