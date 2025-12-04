import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import {
  CreateGeofencePayload,
  Geofence,
  UpdateGeofencePayload,
} from '@/types/geo.types';

export const geofencesService = {
  list: async () => {
    const response = await api.get<Geofence[]>(API_ROUTES.GEOFENCES);
    return response.data;
  },
  detail: async (id: string) => {
    const response = await api.get<Geofence>(API_ROUTES.GEOFENCE_DETAIL(id));
    return response.data;
  },
  create: async (payload: CreateGeofencePayload) => {
    const response = await api.post<Geofence>(API_ROUTES.GEOFENCES, payload);
    return response.data;
  },
  update: async (id: string, payload: UpdateGeofencePayload) => {
    const response = await api.put<Geofence>(API_ROUTES.GEOFENCE_DETAIL(id), payload);
    return response.data;
  },
  remove: async (id: string) => {
    await api.delete(API_ROUTES.GEOFENCE_DETAIL(id));
  },
};
