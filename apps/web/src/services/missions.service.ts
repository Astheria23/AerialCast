import api from '@/lib/axios';
import {
  CreateMissionPayload,
  Mission,
  MissionStatusAction,
  UpdateMissionPayload,
} from '@/types/missions.types';

const MISSIONS_ENDPOINT = 'api/v1/missions';

export const missionsService = {
  getMissions: async () => {
    const response = await api.get<Mission[]>(MISSIONS_ENDPOINT);
    return response.data;
  },

  getMissionById: async (missionId: string) => {
    const response = await api.get<Mission>(`${MISSIONS_ENDPOINT}/${missionId}`);
    return response.data;
  },

  createMission: async (payload: CreateMissionPayload) => {
    const response = await api.post<Mission>(MISSIONS_ENDPOINT, payload);
    return response.data;
  },

  updateMission: async (missionId: string, payload: UpdateMissionPayload) => {
    const response = await api.put<Mission>(`${MISSIONS_ENDPOINT}/${missionId}`, payload);
    return response.data;
  },

  deleteMission: async (missionId: string) => {
    await api.delete(`${MISSIONS_ENDPOINT}/${missionId}`);
  },

  changeStatus: async (missionId: string, action: MissionStatusAction) => {
    const response = await api.post<Mission>(
      `${MISSIONS_ENDPOINT}/${missionId}/status/${action}`
    );
    return response.data;
  },
};
