"use client";

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCcw,
  StickyNote,
  Undo2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  MissionPreflightChecklist,
  MissionPreflightItem,
  PreflightStatus,
} from '@/types/missions.types';

interface MissionPreflightPanelProps {
  missionName?: string;
  preflight: MissionPreflightChecklist | null;
  status?: PreflightStatus;
  loading?: boolean;
  error?: string | null;
  canEdit?: boolean;
  onRefresh?: () => void;
  onToggleItem?: (itemId: string, nextState: boolean) => Promise<void> | void;
  onUpdateNote?: (itemId: string, note: string) => Promise<void> | void;
  updatingItemId?: string | null;
}

const statusBadgeClasses: Record<PreflightStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

export function MissionPreflightPanel({
  missionName,
  preflight,
  status,
  loading = false,
  error,
  canEdit = false,
  onRefresh,
  onToggleItem,
  onUpdateNote,
  updatingItemId,
}: MissionPreflightPanelProps) {
  const [noteOverrides, setNoteOverrides] = useState<Record<string, string | undefined>>({});

  const groupedItems = useMemo(() => {
    const groups = new Map<string, MissionPreflightItem[]>();
    preflight?.items.forEach((item) => 
      groups.set(item.section_title ?? 'Checklist', [
        ...(groups.get(item.section_title ?? 'Checklist') ?? []),
        item,
      ])
    );
    return Array.from(groups.entries())
      .map(([section, items]) => ({
        section,
        items: [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        order: items[0]?.section_order ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  }, [preflight]);

  const totalItems = preflight?.items?.length ?? 0;
  const completedItems = preflight?.items?.filter((item) => item.is_completed).length ?? 0;
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const resolvedStatus = status ?? preflight?.status ?? 'NOT_STARTED';
  const statusClasses = statusBadgeClasses[resolvedStatus] ?? statusBadgeClasses.NOT_STARTED;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold">Preflight readiness</CardTitle>
          <p className="text-sm text-muted-foreground">
            {missionName ? `${missionName}` : 'Mission'} requires all items before launch.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
            {resolvedStatus.replace(/_/g, ' ')}
          </span>
          <div className="text-right text-sm text-muted-foreground">
            <p>
              {completedItems} / {totalItems} items complete
            </p>
            <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          {onRefresh && (
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {loading && !preflight && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preflight checklist...
          </div>
        )}
        {!loading && preflight?.items?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            No checklist items were generated for this mission. Attach a pre-flight checklist to populate tasks.
          </div>
        )}
        {groupedItems.map(({ section, items }) => (
          <div key={section} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{section}</h3>
              <p className="text-xs text-muted-foreground">
                {items.filter((item) => item.is_completed).length} / {items.length} complete
              </p>
            </div>
            <div className="space-y-3">
              {items.map((item) => {
                const hasOverride = Object.prototype.hasOwnProperty.call(
                  noteOverrides,
                  item.preflight_item_id
                );
                const noteValue = hasOverride
                  ? noteOverrides[item.preflight_item_id] ?? ''
                  : item.note ?? '';
                const isDirty = hasOverride && noteValue !== (item.note ?? '');
                const isUpdating = updatingItemId === item.preflight_item_id;
                return (
                  <div
                    key={item.preflight_item_id}
                    className="rounded-lg border border-border/60 bg-card/70 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left"
                        onClick={() =>
                          onToggleItem && onToggleItem(item.preflight_item_id, !item.is_completed)
                        }
                        disabled={!canEdit || isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : item.is_completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">{item.item_text}</span>
                      </button>
                      {item.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          Completed {new Date(item.completed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                        <StickyNote className="h-3 w-3" /> Pilot notes
                      </div>
                      <textarea
                        className="h-20 w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={noteValue}
                        onChange={(event) =>
                          setNoteOverrides((prev) => ({
                            ...prev,
                            [item.preflight_item_id]: event.target.value,
                          }))
                        }
                        placeholder="Add an observation or confirmation"
                        disabled={!canEdit || isUpdating}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {item.completed_by_name
                            ? `Last updated by ${item.completed_by_name}`
                            : 'Not yet completed'}
                        </span>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setNoteOverrides((prev) => {
                                  if (!Object.prototype.hasOwnProperty.call(prev, item.preflight_item_id)) {
                                    return prev;
                                  }
                                  const next = { ...prev };
                                  delete next[item.preflight_item_id];
                                  return next;
                                })
                              }
                              disabled={!isDirty || isUpdating}
                              className="gap-1"
                            >
                              <Undo2 className="h-3 w-3" /> Reset
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                if (!onUpdateNote) {
                                  return;
                                }
                                try {
                                  await onUpdateNote(item.preflight_item_id, noteValue);
                                  setNoteOverrides((prev) => {
                                    if (!Object.prototype.hasOwnProperty.call(prev, item.preflight_item_id)) {
                                      return prev;
                                    }
                                    const next = { ...prev };
                                    delete next[item.preflight_item_id];
                                    return next;
                                  });
                                } catch {
                                  // parent already surfaces the error state
                                }
                              }}
                              disabled={!isDirty || isUpdating}
                              className="gap-1"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
