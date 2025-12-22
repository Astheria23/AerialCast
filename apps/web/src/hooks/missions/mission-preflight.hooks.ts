import { useCallback, useState } from 'react';

import { getFriendlyErrorMessage } from '@/lib/errors';
import { missionsService } from '@/services/missions.service';
import type {
  MissionPreflightChecklist,
  MissionPreflightUpdatePayload,
} from '@/types/missions.types';

interface UseMissionPreflightProps {
  missionId?: string;
}

export const useMissionPreflight = ({ missionId }: UseMissionPreflightProps = {}) => {
  const [preflight, setPreflight] = useState<MissionPreflightChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreflight = useCallback(async () => {
    if (!missionId) {
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await missionsService.getMissionPreflight(missionId);
      setPreflight(data);
      return data;
    } catch (err) {
      const message = getFriendlyErrorMessage(err, 'Failed to fetch preflight checklist');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  const updatePreflight = useCallback(
    async (payload: MissionPreflightUpdatePayload) => {
      if (!missionId) {
        throw new Error('Mission ID is required to update preflight checklist');
      }
      try {
        setLoading(true);
        setError(null);
        const data = await missionsService.updateMissionPreflight(missionId, payload);
        setPreflight(data);
        return data;
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to update preflight checklist');
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [missionId]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    preflight,
    loading,
    error,
    fetchPreflight,
    updatePreflight,
    setPreflight,
    clearError,
  };
};
