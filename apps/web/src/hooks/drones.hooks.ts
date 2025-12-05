import { useQueryClient } from '@tanstack/react-query'

import { dronesService } from '@/services/drones.service'
import { queryKeys } from '@/utils/query-keys'
import { useApiQuery } from './useApiQuery'
import { useApiMutation } from './useApiMutation'
import { CreateDronePayload, Drone, UpdateDronePayload } from '@/types/drones.types'

export const useDrones = () => {
  const queryClient = useQueryClient();

  const dronesQuery = useApiQuery<Drone[]>(queryKeys.drones.all, () => dronesService.getDrones(), {
    staleTime: 60 * 1000,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.drones.all,
    });

  const createDroneMutation = useApiMutation<Drone, CreateDronePayload>(
    (payload) => dronesService.createDrone(payload),
    {
      onSuccess: () => invalidateList(),
    }
  );

  const updateDroneMutation = useApiMutation<Drone, { id: string; payload: UpdateDronePayload }>(
    ({ id, payload }) => dronesService.updateDrone(id, payload),
    {
      onSuccess: () => invalidateList(),
    }
  );

  const deleteDroneMutation = useApiMutation<void, string>((droneId) => dronesService.deleteDrone(droneId), {
    onSuccess: () => invalidateList(),
  });

  const fetchDroneById = (droneId: string) => dronesService.getDroneById(droneId);

  return {
    dronesQuery,
    createDrone: createDroneMutation.mutateAsync,
    createDroneState: createDroneMutation,
    updateDrone: (id: string, payload: UpdateDronePayload) =>
      updateDroneMutation.mutateAsync({ id, payload }),
    updateDroneState: updateDroneMutation,
    deleteDrone: deleteDroneMutation.mutateAsync,
    deleteDroneState: deleteDroneMutation,
    fetchDroneById,
  };
};
