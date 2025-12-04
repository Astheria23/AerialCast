import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import {
  MaintenanceLog,
  MaintenanceLogPayload,
  MaintenanceLogUpdatePayload,
} from '@/types/maintenance.types';

export const maintenanceService = {
  listForDrone: async (droneId: string) => {
    const response = await api.get<MaintenanceLog[]>(API_ROUTES.MAINTENANCE_FOR_DRONE(droneId));
    return response.data;
  },
  create: async (droneId: string, payload: MaintenanceLogPayload) => {
    const response = await api.post<MaintenanceLog>(
      API_ROUTES.MAINTENANCE_FOR_DRONE(droneId),
      payload
    );
    return response.data;
  },
  update: async (logId: string, payload: MaintenanceLogUpdatePayload) => {
    const response = await api.put<MaintenanceLog>(API_ROUTES.MAINTENANCE_DETAIL(logId), payload);
    return response.data;
  },
  remove: async (logId: string) => {
    await api.delete(API_ROUTES.MAINTENANCE_DETAIL(logId));
  },
};
