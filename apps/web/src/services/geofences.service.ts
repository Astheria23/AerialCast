import api from '@/lib/axios';
import { CreateGeofencePayload, Geofence, UpdateGeofencePayload } from '@/types/geofences.types';

const BASE_ENDPOINT = 'api/v1/geofences';

export const geofencesService = {
  getGeofences: async () => {
    const response = await api.get<Geofence[]>(BASE_ENDPOINT);
    return response.data;
  },

  getGeofenceById: async (geofenceId: string) => {
    const response = await api.get<Geofence>(`${BASE_ENDPOINT}/${geofenceId}`);
    return response.data;
  },

  createGeofence: async (payload: CreateGeofencePayload) => {
    const response = await api.post<Geofence>(BASE_ENDPOINT, payload);
    return response.data;
  },

  updateGeofence: async (geofenceId: string, payload: UpdateGeofencePayload) => {
    const response = await api.put<Geofence>(`${BASE_ENDPOINT}/${geofenceId}`, payload);
    return response.data;
  },

  deleteGeofence: async (geofenceId: string) => {
    await api.delete(`${BASE_ENDPOINT}/${geofenceId}`);
  },
};
