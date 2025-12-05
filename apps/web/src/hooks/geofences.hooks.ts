import { useCallback, useState } from 'react';

import { geofencesService } from '@/services/geofences.service';
import {
  CreateGeofencePayload,
  Geofence,
  UpdateGeofencePayload,
} from '@/types/geofences.types';

export const useGeofences = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGeofences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await geofencesService.getGeofences();
      setGeofences(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch geofences';
      setError(message);
      console.error('Error fetching geofences:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGeofenceById = useCallback(async (geofenceId: string) => {
    try {
      setLoading(true);
      setError(null);
      return await geofencesService.getGeofenceById(geofenceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch geofence';
      setError(message);
      console.error('Error fetching geofence:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGeofence = useCallback(async (payload: CreateGeofencePayload) => {
    try {
      setLoading(true);
      setError(null);
      const created = await geofencesService.createGeofence(payload);
      setGeofences((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create geofence';
      setError(message);
      console.error('Error creating geofence:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGeofence = useCallback(
    async (geofenceId: string, payload: UpdateGeofencePayload) => {
      try {
        setLoading(true);
        setError(null);
        const updated = await geofencesService.updateGeofence(geofenceId, payload);
        setGeofences((prev) =>
          prev.map((geofence) => (geofence.geofence_id === geofenceId ? updated : geofence))
        );
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update geofence';
        setError(message);
        console.error('Error updating geofence:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteGeofence = useCallback(async (geofenceId: string) => {
    try {
      setLoading(true);
      setError(null);
      await geofencesService.deleteGeofence(geofenceId);
      setGeofences((prev) => prev.filter((geofence) => geofence.geofence_id !== geofenceId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete geofence';
      setError(message);
      console.error('Error deleting geofence:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    geofences,
    loading,
    error,
    fetchGeofences,
    fetchGeofenceById,
    createGeofence,
    updateGeofence,
    deleteGeofence,
  };
};
