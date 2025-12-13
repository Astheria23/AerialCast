import api from '@/lib/axios'
import {
  CreateMaintenanceLogPayload,
  MaintenanceAssignee,
  MaintenanceLog,
  UpdateMaintenanceLogPayload,
} from '@/types/maintenance.types'

const BASE_ENDPOINT = 'api/v1'

export const maintenanceService = {
  getLogsByDrone: async (droneId: string) => {
    const response = await api.get<MaintenanceLog[]>(`${BASE_ENDPOINT}/drones/${droneId}/maintenance`)
    return response.data
  },

  createLog: async (droneId: string, payload: CreateMaintenanceLogPayload) => {
    const response = await api.post<MaintenanceLog>(`${BASE_ENDPOINT}/drones/${droneId}/maintenance`, payload)
    return response.data
  },

  updateLog: async (logId: string, payload: UpdateMaintenanceLogPayload) => {
    const response = await api.put<MaintenanceLog>(`${BASE_ENDPOINT}/maintenance/${logId}`, payload)
    return response.data
  },

  deleteLog: async (logId: string) => {
    await api.delete(`${BASE_ENDPOINT}/maintenance/${logId}`)
  },

  getAssignees: async () => {
    const response = await api.get<MaintenanceAssignee[]>(`${BASE_ENDPOINT}/maintenance/assignees`)
    return response.data
  },
}
