'use client';

import type { ElementType } from 'react';
import { AlertTriangle, Info, MapPin } from 'lucide-react';

import type { TelemetryEventItem } from '@/types/telemetry.types';

interface TelemetryEventFeedProps {
  events: TelemetryEventItem[];
}

const severityStyles: Record<string, { classes: string; icon: ElementType }> = {
  info: { classes: 'bg-slate-900/5 text-slate-900 dark:text-slate-100', icon: MapPin },
  warning: { classes: 'bg-amber-100 text-amber-900', icon: Info },
  danger: { classes: 'bg-rose-100 text-rose-900', icon: AlertTriangle },
};

export function TelemetryEventFeed({ events }: TelemetryEventFeedProps) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
        Waiting for telemetry updates...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const severity = severityStyles[event.severity ?? 'info'] ?? severityStyles.info;
        const Icon = severity.icon;
        const timestamp = new Date(event.timestamp);
        return (
          <div
            key={event.id}
            className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm"
          >
            <div className={`rounded-full p-2 ${severity.classes}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{timestamp.toLocaleTimeString()}</span>
                <span>{timestamp.toLocaleDateString()}</span>
              </div>
              <p className="font-medium">{event.summary}</p>
              {event.details && <p className="text-sm text-muted-foreground">{event.details}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
