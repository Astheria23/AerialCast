export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  DRONES: '/api/v1/drones',
  CHECKLISTS: '/api/v1/checklists',
  CHECKLIST_DETAIL: (id: string) => `/api/v1/checklists/${id}`,
  MISSIONS: '/api/v1/missions',
  MISSION_DETAIL: (id: string) => `/api/v1/missions/${id}`,
  MISSION_STATUS: (id: string, action: string) =>
    `/api/v1/missions/${id}/status/${action}`,
  SESSIONS: '/api/v1/sessions',
  SESSION_DETAIL: (id: string) => `/api/v1/sessions/${id}`,
  SESSION_REPLAY: (id: string) => `/api/v1/sessions/${id}/replay`,
  SESSION_END: (id: string) => `/api/v1/sessions/${id}/end`,
  ALERTS: '/api/v1/alerts',
  ALERT_DETAIL: (id: string) => `/api/v1/alerts/${id}`,
  ALERTS_BY_SESSION: (sessionId: string) =>
    `/api/v1/alerts/session/${sessionId}`,
  GEOFENCES: '/api/v1/geofences',
  GEOFENCE_DETAIL: (id: string) => `/api/v1/geofences/${id}`,
  MAINTENANCE_FOR_DRONE: (droneId: string) =>
    `/api/v1/drones/${droneId}/maintenance`,
  MAINTENANCE_DETAIL: (logId: string) => `/api/v1/maintenance/${logId}`,
};

export type ApiRoutes = typeof API_ROUTES;
