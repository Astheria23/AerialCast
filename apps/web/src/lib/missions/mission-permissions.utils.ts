import type { Mission, MissionStatus, MissionStatusAction } from '@/types/missions.types';
import type { User } from '@/types/auth.types';
import { EDITABLE_PREFLIGHT_STATUSES, EDITABLE_POSTFLIGHT_STATUSES } from './mission.constants';

export interface PermissionContext {
  user: User | null;
  isAdmin: boolean;
  isPilot: boolean;
}

export function canPerformStatusAction(
  mission: Mission,
  action: MissionStatusAction,
  context: PermissionContext
): boolean {
  const { user, isAdmin, isPilot } = context;
  if (!user) return false;

  const isOwner = mission.created_by_user_id === user.id;
  const adminIsOwner = isAdmin && isOwner;

  switch (action) {
    case 'approve':
    case 'reject':
    case 'cancel':
      return isAdmin;
    case 'submit':
      return isOwner || isAdmin;
    case 'start':
    case 'complete':
      return (isOwner && isPilot) || adminIsOwner;
    default:
      return false;
  }
}

export function canEditPreflight(mission: Mission | null, context: PermissionContext): boolean {
  if (!mission || !context.user) return false;

  const status = mission.status ?? 'DRAFT';
  if (!EDITABLE_PREFLIGHT_STATUSES.includes(status as MissionStatus)) {
    return false;
  }

  if (context.isAdmin) return true;

  const requesterId = context.user.id;
  return (
    mission.created_by_user_id === requesterId ||
    mission.assigned_pilot_id === requesterId
  );
}

export function canEditPostflight(mission: Mission | null, context: PermissionContext): boolean {
  if (!mission || !context.user) return false;

  const status = mission.status ?? 'DRAFT';
  if (!EDITABLE_POSTFLIGHT_STATUSES.includes(status as MissionStatus)) {
    return false;
  }

  if (context.isAdmin) return true;

  const requesterId = context.user.id;
  return (
    mission.created_by_user_id === requesterId ||
    mission.assigned_pilot_id === requesterId
  );
}

export function canControlMission(mission: Mission | null, context: PermissionContext): boolean {
  if (!mission || !context.user) return false;

  const isOwner = mission.created_by_user_id === context.user.id;
  const adminIsOwner = context.isAdmin && isOwner;

  return (isOwner && context.isPilot) || adminIsOwner;
}

export function canStartMission(mission: Mission | null, context: PermissionContext): boolean {
  return mission?.status === 'READY_FOR_FLIGHT' && canControlMission(mission, context);
}

export function canEndMission(mission: Mission | null, context: PermissionContext): boolean {
  return mission?.status === 'IN_PROGRESS' && canControlMission(mission, context);
}

export function canManageMissions(context: PermissionContext): boolean {
  return context.isAdmin || context.isPilot;
}

export function getVisibleMissions(missions: Mission[], context: PermissionContext): Mission[] {
  if (context.isAdmin) return missions;
  if (context.user?.id) {
    return missions.filter((mission) => mission.created_by_user_id === context.user!.id);
  }
  return missions;
}
