import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import { Alert } from '@/types/alerts.types';

export const alertsService = {
  list: async () => {
    const response = await api.get<Alert[]>(API_ROUTES.ALERTS);
    return response.data;
  },
  detail: async (alertId: string) => {
    const response = await api.get<Alert>(API_ROUTES.ALERT_DETAIL(alertId));
    return response.data;
  },
  bySession: async (sessionId: string) => {
    const response = await api.get<Alert[]>(API_ROUTES.ALERTS_BY_SESSION(sessionId));
    return response.data;
  },
};
