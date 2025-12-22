import type { Mission, MissionStatus, MissionStatusAction } from '@/types/missions.types';
import { STATUS_COLORS, STATUS_ACTION_MAP, DESTRUCTIVE_ACTIONS } from './mission.constants';

export function getStatusColor(status?: MissionStatus | string): string {
  if (!status) return STATUS_COLORS.DRAFT;
  return STATUS_COLORS[status as MissionStatus] ?? STATUS_COLORS.DRAFT;
}

export function formatStatusLabel(status?: MissionStatus | string): string {
  if (!status) return 'Draft';
  return status.replace(/_/g, ' ');
}

export function getAvailableActions(status?: MissionStatus | string): MissionStatusAction[] {
  if (!status) return [];
  return STATUS_ACTION_MAP[status as MissionStatus] ?? [];
}

export function isDestructiveAction(action: MissionStatusAction): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action);
}

export function getDroneLabel(mission: Mission, droneLookup?: Record<string, string>): string {
  if (mission.drone_name) return mission.drone_name;
  if (droneLookup?.[mission.drone_id]) return droneLookup[mission.drone_id];
  return mission.drone_id ?? '—';
}

export function getPilotLabel(mission: Mission): string {
  return mission.pilot_name ?? 'Unassigned';
}

export function calculateChecklistProgress(items: Array<{ is_completed?: boolean }> = []): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = items.length;
  const completed = items.filter((item) => item.is_completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}
