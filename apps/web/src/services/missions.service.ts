import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import { Mission, MissionPayload, MissionUpdatePayload } from '@/types/missions.types';

type MissionStatusAction = 'submit' | 'approve' | 'reject' | 'start' | 'complete' | 'cancel';

export const missionsService = {
  list: async () => {
    const response = await api.get<Mission[]>(API_ROUTES.MISSIONS);
    return response.data;
  },
  detail: async (missionId: string) => {
    const response = await api.get<Mission>(API_ROUTES.MISSION_DETAIL(missionId));
    return response.data;
  },
  create: async (payload: MissionPayload) => {
    const response = await api.post<Mission>(API_ROUTES.MISSIONS, payload);
    return response.data;
  },
  update: async (missionId: string, payload: MissionUpdatePayload) => {
    const response = await api.put<Mission>(API_ROUTES.MISSION_DETAIL(missionId), payload);
    return response.data;
  },
  remove: async (missionId: string) => {
    await api.delete(API_ROUTES.MISSION_DETAIL(missionId));
  },
  changeStatus: async (missionId: string, action: MissionStatusAction) => {
    const response = await api.post<Mission>(
      API_ROUTES.MISSION_STATUS(missionId, action),
      {}
    );
    return response.data;
  },
};
