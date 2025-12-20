import { useCallback, useState } from 'react';
import { missionsService } from '@/services/missions.service';
import type { Mission, MissionStatusAction } from '@/types/missions.types';

export interface UseMissionDetailsOptions {
  missionId: string;
  onMissionUpdated?: (mission: Mission) => void;
}

export function useMissionDetails({ missionId, onMissionUpdated }: UseMissionDetailsOptions) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const refreshMission = useCallback(async () => {
    if (!missionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await missionsService.getMissionById(missionId);
      setMission(data);
      onMissionUpdated?.(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mission';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [missionId, onMissionUpdated]);

  const handleStatusChange = useCallback(
    async (action: MissionStatusAction) => {
      if (!missionId) return;
      setStatusLoading(true);
      setStatusError(null);
      try {
        const updated = await missionsService.changeStatus(missionId, action);
        setMission(updated);
        onMissionUpdated?.(updated);
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update mission status';
        setStatusError(message);
        throw err;
      } finally {
        setStatusLoading(false);
      }
    },
    [missionId, onMissionUpdated]
  );

  return {
    mission,
    loading,
    error,
    statusLoading,
    statusError,
    refreshMission,
    handleStatusChange,
    setMission,
  };
}
