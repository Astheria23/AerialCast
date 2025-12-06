'use client';

import type { ElementType } from 'react';
import { Activity, AlertTriangle, Pause, Play, Radio } from 'lucide-react';

import type { TelemetryConnectionState } from '@/types/telemetry.types';

interface TelemetryStatusIndicatorProps {
  state: TelemetryConnectionState;
}

const STATE_STYLES: Record<
  TelemetryConnectionState,
  { label: string; classes: string; icon: ElementType }
> = {
  idle: { label: 'Idle', classes: 'bg-zinc-100 text-zinc-700', icon: Pause },
  connecting: { label: 'Connecting', classes: 'bg-amber-100 text-amber-700', icon: Activity },
  live: { label: 'Live', classes: 'bg-emerald-100 text-emerald-700', icon: Radio },
  replay: { label: 'Replay', classes: 'bg-sky-100 text-sky-700', icon: Play },
  disconnected: { label: 'Disconnected', classes: 'bg-zinc-200 text-zinc-700', icon: Pause },
  error: { label: 'Error', classes: 'bg-rose-100 text-rose-700', icon: AlertTriangle },
};

export function TelemetryStatusIndicator({ state }: TelemetryStatusIndicatorProps) {
  const definition = STATE_STYLES[state] ?? STATE_STYLES.idle;
  const Icon = definition.icon;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium ${definition.classes}`}>
        <Icon className="h-4 w-4" />
        {definition.label}
      </span>
    </div>
  );
}
