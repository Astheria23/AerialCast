import { useCallback } from 'react';
import type { Mission } from '@/types/missions.types';
import type { MissionFormPayload } from '@/components/missions/mission-form';
import { getFriendlyErrorMessage } from '@/lib/errors';

export interface UseMissionCrudOptions {
  createMission: (payload: any) => Promise<void>;
  updateMission: (id: string, payload: any) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
  canManage: boolean;
  onSuccess?: (action: 'create' | 'edit' | 'delete', missionName?: string) => void;
  onError?: (action: 'create' | 'edit' | 'delete', error: string) => void;
  setIsSubmitting: (value: boolean) => void;
  setFormError: (value: string | null) => void;
}

export function useMissionCrud({
  createMission,
  updateMission,
  deleteMission,
  canManage,
  onSuccess,
  onError,
  setIsSubmitting,
  setFormError,
}: UseMissionCrudOptions) {
  const handleCreate = useCallback(
    async (payload: MissionFormPayload) => {
      if (!canManage) return;
      setIsSubmitting(true);
      setFormError(null);
      try {
        await createMission({
          mission_name: payload.mission_name,
          drone_id: payload.drone_id,
          notes: payload.notes,
          save_as_draft: payload.save_as_draft,
          waypoints: payload.waypoints,
          checklist_ids: payload.checklist_ids,
          geofence_ids: payload.geofence_ids,
        });
        onSuccess?.('create', payload.mission_name);
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to create mission');
        setFormError(message);
        onError?.('create', message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canManage, createMission, onSuccess, onError, setIsSubmitting, setFormError]
  );

  const handleEdit = useCallback(
    async (mission: Mission, payload: MissionFormPayload) => {
      if (!canManage) return;
      setIsSubmitting(true);
      setFormError(null);
      try {
        await updateMission(mission.mission_id, {
          mission_name: payload.mission_name,
          drone_id: payload.drone_id,
          notes: payload.notes,
          save_as_draft: payload.save_as_draft,
          status: payload.status,
          waypoints: payload.waypoints,
          checklist_ids: payload.checklist_ids,
          geofence_ids: payload.geofence_ids,
        });
        onSuccess?.('edit', payload.mission_name);
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to update mission');
        setFormError(message);
        onError?.('edit', message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canManage, updateMission, onSuccess, onError, setIsSubmitting, setFormError]
  );

  const handleDelete = useCallback(
    async (missionId: string, missionName?: string) => {
      if (!canManage) return;
      if (!confirm('Delete this mission?')) return;

      try {
        await deleteMission(missionId);
        onSuccess?.('delete', missionName);
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to delete mission');
        onError?.('delete', message);
      }
    },
    [canManage, deleteMission, onSuccess, onError]
  );

  return {
    handleCreate,
    handleEdit,
    handleDelete,
  };
}
