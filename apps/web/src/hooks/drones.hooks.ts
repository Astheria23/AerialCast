import { useState, useCallback } from 'react';
import { dronesService } from '@/services/drones.service';
import { Drone, CreateDronePayload, UpdateDronePayload } from '@/types/drones.types';

export const useDrones = () => {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dronesService.getDrones();
      setDrones(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch drones';
      setError(message);
      console.error('Error fetching drones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDroneById = useCallback(async (droneId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dronesService.getDroneById(droneId);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch drone';
      setError(message);
      console.error('Error fetching drone:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createDrone = useCallback(async (payload: CreateDronePayload) => {
    try {
      setLoading(true);
      setError(null);
      const newDrone = await dronesService.createDrone(payload);
      setDrones((prev) => [...prev, newDrone]);
      return newDrone;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create drone';
      setError(message);
      console.error('Error creating drone:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDrone = useCallback(
    async (droneId: string, payload: UpdateDronePayload) => {
      try {
        setLoading(true);
        setError(null);
        const updatedDrone = await dronesService.updateDrone(droneId, payload);
        setDrones((prev) =>
          prev.map((drone) => (drone.drone_id === droneId ? updatedDrone : drone))
        );
        return updatedDrone;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update drone';
        setError(message);
        console.error('Error updating drone:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteDrone = useCallback(async (droneId: string) => {
    try {
      setLoading(true);
      setError(null);
      await dronesService.deleteDrone(droneId);
      setDrones((prev) => prev.filter((drone) => drone.drone_id !== droneId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete drone';
      setError(message);
      console.error('Error deleting drone:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    drones,
    loading,
    error,
    fetchDrones,
    fetchDroneById,
    createDrone,
    updateDrone,
    deleteDrone,
  };
};
