"use client";

import { Fragment, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Loader2, RefreshCcw, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  readOnly?: boolean;
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
  readOnly = false,
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
  const statusClasses =
    statusBadgeClasses[resolvedStatus as PreflightStatus] ?? statusBadgeClasses.NOT_STARTED;
  const allowToggle = Boolean(canEdit && !readOnly && onToggleItem);
  const allowNoteEdit = Boolean(canEdit && !readOnly && onUpdateNote);
  const showActionsColumn = allowNoteEdit;

  const handleSaveNote = async (itemId: string, value: string) => {
    if (!allowNoteEdit || !onUpdateNote) {
      return;
    }
    try {
      await onUpdateNote(itemId, value);
      setNoteOverrides((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, itemId)) {
          return prev;
        }
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch {
      // parent handles error state; keep current override so pilot can retry
    }
  };

  const handleResetNote = (itemId: string) => {
    setNoteOverrides((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, itemId)) {
        return prev;
      }
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-card/80 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Pre-flight readiness</h2>
            <p className="text-sm text-muted-foreground">
              {missionName ? `${missionName}` : 'Mission'} must pass these checks before takeoff.
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
              <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-muted">
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
        </div>
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading && !preflight && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading pre-flight checklist...
            </div>
          )}
          {totalItems === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              No pre-flight checklist items were generated for this mission.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Section</th>
                    <th className="px-4 py-3 text-left">Checklist item</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Pilot note</th>
                    {showActionsColumn && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {groupedItems.map(({ section, items }) => (
                    <Fragment key={section}>
                      {items.map((item, index) => {
                        const itemId = item.preflight_item_id;
                        const hasOverride = Object.prototype.hasOwnProperty.call(noteOverrides, itemId);
                        const baseNote = item.note ?? '';
                        const noteValue = hasOverride ? noteOverrides[itemId] ?? '' : baseNote;
                        const isDirty = hasOverride && noteValue !== baseNote;
                        const isUpdating = updatingItemId === itemId;
                        const completionMeta = item.completed_at
                          ? `Completed ${new Date(item.completed_at).toLocaleString()}`
                          : undefined;
                        return (
                          <tr key={itemId} className="bg-card/60">
                            {index === 0 && (
                              <td
                                className="w-40 border-t border-border/40 px-4 py-3 align-top text-sm font-semibold text-foreground"
                                rowSpan={items.length}
                              >
                                <div>{section}</div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {items.filter((entry) => entry.is_completed).length} / {items.length} complete
                                </div>
                              </td>
                            )}
                            <td className="max-w-md border-t border-border/40 px-4 py-3 align-top">
                              <div className="font-medium text-foreground">{item.item_text}</div>
                              {completionMeta && (
                                <div className="mt-1 text-xs text-muted-foreground">{completionMeta}</div>
                              )}
                              {item.completed_by_name && (
                                <div className="text-xs text-muted-foreground">
                                  Last updated by {item.completed_by_name}
                                </div>
                              )}
                            </td>
                            <td className="w-32 border-t border-border/40 px-4 py-3 text-center align-top">
                              {isUpdating ? (
                                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                              ) : allowToggle ? (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 cursor-pointer"
                                  checked={item.is_completed}
                                  onChange={(event) =>
                                    onToggleItem?.(itemId, event.target.checked)
                                  }
                                  disabled={isUpdating}
                                  aria-label={`Mark ${item.item_text} as ${item.is_completed ? 'incomplete' : 'complete'}`}
                                />
                              ) : (
                                <div className="flex items-center justify-center">
                                  {item.is_completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="border-t border-border/40 px-4 py-3 align-top">
                              {allowNoteEdit ? (
                                <textarea
                                  className="h-24 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  value={noteValue}
                                  onChange={(event) =>
                                    setNoteOverrides((prev) => ({
                                      ...prev,
                                      [itemId]: event.target.value,
                                    }))
                                  }
                                  placeholder="Add an observation or confirmation"
                                  disabled={isUpdating}
                                />
                              ) : noteValue ? (
                                <div className="whitespace-pre-wrap text-sm text-foreground">{noteValue}</div>
                              ) : (
                                <span className="text-sm italic text-muted-foreground">No notes recorded</span>
                              )}
                            </td>
                            {showActionsColumn && (
                              <td className="w-48 border-t border-border/40 px-4 py-3 align-top">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleResetNote(itemId)}
                                    disabled={!isDirty || isUpdating}
                                  >
                                    <Undo2 className="mr-1 h-3 w-3" /> Reset
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void handleSaveNote(itemId, noteValue)}
                                    disabled={!isDirty || isUpdating}
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Save'
                                    )}
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
  );
}
