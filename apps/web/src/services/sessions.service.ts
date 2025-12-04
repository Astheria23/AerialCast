import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import { FlightSession } from '@/types/sessions.types';
import { TelemetryPoint } from '@/types/telemetry.types';

export const sessionsService = {
  list: async () => {
    const response = await api.get<FlightSession[]>(API_ROUTES.SESSIONS);
    return response.data;
  },
  detail: async (sessionId: string) => {
    const response = await api.get<FlightSession>(API_ROUTES.SESSION_DETAIL(sessionId));
    return response.data;
  },
  replay: async (sessionId: string) => {
    const response = await api.get<TelemetryPoint[]>(API_ROUTES.SESSION_REPLAY(sessionId));
    return response.data;
  },
  end: async (sessionId: string) => {
    const response = await api.post<FlightSession>(API_ROUTES.SESSION_END(sessionId), {});
    return response.data;
  },
};
