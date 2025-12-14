import api from '@/lib/axios';
import type { AlertType, MissionAlert } from '@/types/telemetry.types';

const ALERTS_ENDPOINT = 'api/v1/alerts';

type AlertQuery = {
  sessionId?: string;
  missionId?: string;
  type?: AlertType;
  limit?: number;
};

const buildAlertQuery = (params: AlertQuery = {}) => {
  const search = new URLSearchParams();
  if (params.sessionId) {
    search.set('session_id', params.sessionId);
  }
  if (params.missionId) {
    search.set('mission_id', params.missionId);
  }
  if (params.type) {
    search.set('type', params.type);
  }
  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit));
  }
  return search.toString();
};

const fetchAlerts = async (params: AlertQuery = {}) => {
  const query = buildAlertQuery(params);
  const url = query ? `${ALERTS_ENDPOINT}?${query}` : ALERTS_ENDPOINT;
  const response = await api.get<MissionAlert[]>(url);
  return response.data ?? [];
};

export const alertService = {
  async listBySession(sessionId: string, params: Omit<AlertQuery, 'sessionId'> = {}) {
    return fetchAlerts({ sessionId, ...params });
  },
  async listByMission(missionId: string, params: Omit<AlertQuery, 'missionId'> = {}) {
    return fetchAlerts({ missionId, ...params });
  },
};
