import { useCallback, useState } from 'react';

import { getFriendlyErrorMessage } from '@/lib/errors';
import { missionsService } from '@/services/missions.service';
import type {
  MissionPostflightChecklist,
  MissionPostflightUpdatePayload,
} from '@/types/missions.types';

interface UseMissionPostflightProps {
  missionId?: string;
}

export const useMissionPostflight = ({ missionId }: UseMissionPostflightProps = {}) => {
  const [postflight, setPostflight] = useState<MissionPostflightChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPostflight = useCallback(async () => {
    if (!missionId) {
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await missionsService.getMissionPostflight(missionId);
      setPostflight(data);
      return data;
    } catch (err) {
      const message = getFriendlyErrorMessage(err, 'Failed to fetch post-flight checklist');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  const updatePostflight = useCallback(
    async (payload: MissionPostflightUpdatePayload) => {
      if (!missionId) {
        throw new Error('Mission ID is required to update post-flight checklist');
      }
      try {
        setLoading(true);
        setError(null);
        const data = await missionsService.updateMissionPostflight(missionId, payload);
        setPostflight(data);
        return data;
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to update post-flight checklist');
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
    postflight,
    loading,
    error,
    fetchPostflight,
    updatePostflight,
    setPostflight,
    clearError,
  };
};
