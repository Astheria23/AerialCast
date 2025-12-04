import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import { Drone, CreateDronePayload, UpdateDronePayload } from '@/types/drones.types';

export const dronesService = {
  /**
   * Get all drones
   */
  getDrones: async () => {
    const response = await api.get<Drone[]>(API_ROUTES.DRONES);
    return response.data;
  },

  /**
   * Get a single drone by ID
   */
  getDroneById: async (droneId: string) => {
    const response = await api.get<Drone>(`${API_ROUTES.DRONES}/${droneId}`);
    return response.data;
  },

  /**
   * Create a new drone
   */
  createDrone: async (payload: CreateDronePayload) => {
    const response = await api.post<Drone>(API_ROUTES.DRONES, payload);
    return response.data;
  },

  /**
   * Update a drone
   */
  updateDrone: async (droneId: string, payload: UpdateDronePayload) => {
    const response = await api.put<Drone>(
      `${API_ROUTES.DRONES}/${droneId}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete a drone
   */
  deleteDrone: async (droneId: string) => {
    await api.delete(`${API_ROUTES.DRONES}/${droneId}`);
  },
};
