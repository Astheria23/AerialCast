import api from '@/lib/axios';
import {
  CreateMissionPayload,
  Mission,
  MissionStatusAction,
  MissionPreflightChecklist,
  MissionPreflightUpdatePayload,
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

  getMissionPreflight: async (missionId: string) => {
    const response = await api.get<MissionPreflightChecklist>(
      `${MISSIONS_ENDPOINT}/${missionId}/preflight`
    );
    return response.data;
  },

  updateMissionPreflight: async (
    missionId: string,
    payload: MissionPreflightUpdatePayload
  ) => {
    const response = await api.put<MissionPreflightChecklist>(
      `${MISSIONS_ENDPOINT}/${missionId}/preflight`,
      payload
    );
    return response.data;
  },
};
