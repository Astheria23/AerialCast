import api from '@/lib/axios';
import { Drone, CreateDronePayload, UpdateDronePayload } from '@/types/drones.types';

const DRONES_ENDPOINT = 'api/v1/drones';

export const dronesService = {
  /**
   * Get all drones
   */
  getDrones: async () => {
    const response = await api.get<Drone[]>(DRONES_ENDPOINT);
    return response.data;
  },

  /**
   * Get a single drone by ID
   */
  getDroneById: async (droneId: string) => {
    const response = await api.get<Drone>(`${DRONES_ENDPOINT}/${droneId}`);
    return response.data;
  },

  /**
   * Create a new drone
   */
  createDrone: async (payload: CreateDronePayload) => {
    const response = await api.post<Drone>(DRONES_ENDPOINT, payload);
    return response.data;
  },

  /**
   * Update a drone
   */
  updateDrone: async (droneId: string, payload: UpdateDronePayload) => {
    const response = await api.put<Drone>(
      `${DRONES_ENDPOINT}/${droneId}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete a drone
   */
  deleteDrone: async (droneId: string) => {
    await api.delete(`${DRONES_ENDPOINT}/${droneId}`);
  },
};
