import { useCallback, useState } from 'react';

import { getFriendlyErrorMessage } from '@/lib/errors';
import { missionsService } from '@/services/missions.service';
import {
  CreateMissionPayload,
  Mission,
  MissionStatusAction,
  UpdateMissionPayload,
} from '@/types/missions.types';

export const useMissions = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const fetchMissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await missionsService.getMissions();
      setMissions(data);
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to fetch missions');
      setError(message);
      console.error('Error fetching missions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMissionById = useCallback(async (missionId: string) => {
    try {
      setLoading(true);
      setError(null);
      return await missionsService.getMissionById(missionId);
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to fetch mission');
      setError(message);
      console.error('Error fetching mission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createMission = useCallback(async (payload: CreateMissionPayload) => {
    try {
      setLoading(true);
      setError(null);
      const mission = await missionsService.createMission(payload);
      setMissions((prev) => [mission, ...prev]);
      return mission;
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to create mission');
      setError(message);
      console.error('Error creating mission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMission = useCallback(
    async (missionId: string, payload: UpdateMissionPayload) => {
      try {
        setLoading(true);
        setError(null);
        const updated = await missionsService.updateMission(missionId, payload);
        setMissions((prev) =>
          prev.map((mission) => (mission.mission_id === missionId ? updated : mission))
        );
        return updated;
      } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to update mission');
        setError(message);
        console.error('Error updating mission:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteMission = useCallback(async (missionId: string) => {
    try {
      setLoading(true);
      setError(null);
      await missionsService.deleteMission(missionId);
      setMissions((prev) => prev.filter((mission) => mission.mission_id !== missionId));
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to delete mission');
      setError(message);
      console.error('Error deleting mission:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changeMissionStatus = useCallback(
    async (missionId: string, action: MissionStatusAction) => {
      try {
        setLoading(true);
        setError(null);
        const updated = await missionsService.changeStatus(missionId, action);
        setMissions((prev) =>
          prev.map((mission) => (mission.mission_id === missionId ? updated : mission))
        );
        return updated;
      } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to change mission status');
        setError(message);
        console.error('Error changing mission status:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    missions,
    loading,
    error,
    clearError,
    fetchMissions,
    fetchMissionById,
    createMission,
    updateMission,
    deleteMission,
    changeMissionStatus,
  };
};
