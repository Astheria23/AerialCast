import { useMemo } from 'react';
import type { Mission } from '@/types/missions.types';
import type { User } from '@/types/auth.types';
import {
  canEditPreflight as canEditPreflightUtil,
  canEditPostflight as canEditPostflightUtil,
  canControlMission as canControlMissionUtil,
  canStartMission as canStartMissionUtil,
  canEndMission as canEndMissionUtil,
} from '@/lib/missions/mission-permissions.utils';

export interface UseMissionPermissionsOptions {
  mission: Mission | null;
  user: User | null;
  isAdmin: boolean;
  isPilot: boolean;
}

export function useMissionPermissions({
  mission,
  user,
  isAdmin,
  isPilot,
}: UseMissionPermissionsOptions) {
  const permissionContext = useMemo(
    () => ({ user, isAdmin, isPilot }),
    [user, isAdmin, isPilot]
  );

  const canEditPreflight = useMemo(
    () => canEditPreflightUtil(mission, permissionContext),
    [mission, permissionContext]
  );

  const canEditPostflight = useMemo(
    () => canEditPostflightUtil(mission, permissionContext),
    [mission, permissionContext]
  );

  const canControlMission = useMemo(
    () => canControlMissionUtil(mission, permissionContext),
    [mission, permissionContext]
  );

  const canStartMission = useMemo(
    () => canStartMissionUtil(mission, permissionContext),
    [mission, permissionContext]
  );

  const canEndMission = useMemo(
    () => canEndMissionUtil(mission, permissionContext),
    [mission, permissionContext]
  );

  return {
    canEditPreflight,
    canEditPostflight,
    canControlMission,
    canStartMission,
    canEndMission,
  };
}
