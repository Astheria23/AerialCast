import api from '@/lib/axios'
import { Checklist, CreateChecklistPayload, UpdateChecklistPayload } from '@/types/checklists.types'

const CHECKLISTS_ENDPOINT = 'api/v1/checklists'

export const checklistsService = {
  getChecklists: async () => {
    const response = await api.get<Checklist[]>(CHECKLISTS_ENDPOINT)
    return response.data
  },

  getChecklistById: async (checklistId: string) => {
    const response = await api.get<Checklist>(`${CHECKLISTS_ENDPOINT}/${checklistId}`)
    return response.data
  },

  createChecklist: async (payload: CreateChecklistPayload) => {
    const response = await api.post<Checklist>(CHECKLISTS_ENDPOINT, payload)
    return response.data
  },

  updateChecklist: async (checklistId: string, payload: UpdateChecklistPayload) => {
    const response = await api.put<Checklist>(`${CHECKLISTS_ENDPOINT}/${checklistId}`, payload)
    return response.data
  },

  deleteChecklist: async (checklistId: string) => {
    await api.delete(`${CHECKLISTS_ENDPOINT}/${checklistId}`)
  },
}
