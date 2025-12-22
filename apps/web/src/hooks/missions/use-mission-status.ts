import { useState } from 'react';
import type { Mission, MissionStatusAction } from '@/types/missions.types';
import { STATUS_ACTION_CONFIRMATION, DESTRUCTIVE_ACTIONS } from '@/lib/missions/mission.constants';

export interface UseMissionStatusOptions {
  onStatusChange: (missionId: string, action: MissionStatusAction) => Promise<void>;
}

export function useMissionStatus({ onStatusChange }: UseMissionStatusOptions) {
  const [statusActionMissionId, setStatusActionMissionId] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const handleStatusAction = async (mission: Mission, action: MissionStatusAction) => {
    const isDestructive = DESTRUCTIVE_ACTIONS.includes(action);
    const confirmationMessage = STATUS_ACTION_CONFIRMATION[action];

    if (isDestructive && !confirm(confirmationMessage)) {
      return;
    }

    setStatusActionMissionId(mission.mission_id);
    setStatusActionError(null);

    try {
      await onStatusChange(mission.mission_id, action);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update mission status';
      setStatusActionError(message);
      throw error;
    } finally {
      setStatusActionMissionId(null);
    }
  };

  return {
    statusActionMissionId,
    statusActionError,
    setStatusActionError,
    handleStatusAction,
  };
}
