import type { MissionStatus, MissionStatusAction } from '@/types/missions.types';

export const MISSION_STATUSES: readonly MissionStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'READY_FOR_FLIGHT',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const;

export const STATUS_COLORS: Record<MissionStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  READY_FOR_FLIGHT: 'bg-sky-100 text-sky-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-zinc-100 text-zinc-700',
};

export const STATUS_ACTION_MAP: Partial<Record<MissionStatus, MissionStatusAction[]>> = {
  DRAFT: ['submit', 'cancel'],
  PENDING_APPROVAL: ['approve', 'reject', 'cancel'],
  APPROVED: ['cancel'],
  READY_FOR_FLIGHT: ['start', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
};

export const STATUS_ACTION_LABELS: Record<MissionStatusAction, string> = {
  submit: 'Submit',
  approve: 'Approve',
  reject: 'Reject',
  start: 'Start',
  complete: 'Complete',
  cancel: 'Cancel',
};

export const STATUS_ACTION_CONFIRMATION: Record<MissionStatusAction, string> = {
  submit: 'Submit this mission for approval?',
  approve: 'Approve this mission?',
  reject: 'Reject this mission?',
  start: 'Mark this mission as in progress?',
  complete: 'Mark this mission as completed?',
  cancel: 'Cancel this mission?',
};

export const DESTRUCTIVE_ACTIONS: readonly MissionStatusAction[] = ['reject', 'cancel'] as const;

export const EDITABLE_PREFLIGHT_STATUSES: readonly MissionStatus[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'READY_FOR_FLIGHT',
] as const;

export const EDITABLE_POSTFLIGHT_STATUSES: readonly MissionStatus[] = ['COMPLETED'] as const;

export const TELEMETRY_STREAMABLE_STATUSES: readonly MissionStatus[] = [
  'APPROVED',
  'IN_PROGRESS',
  'READY_FOR_FLIGHT',
] as const;
