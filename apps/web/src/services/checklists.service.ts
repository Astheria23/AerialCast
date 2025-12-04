import api from '@/lib/axios';
import { API_ROUTES } from '@/constants/api-routes';
import {
  Checklist,
  ChecklistPayload,
  ChecklistUpdatePayload,
} from '@/types/checklists.types';

export const checklistsService = {
  list: async () => {
    const response = await api.get<Checklist[]>(API_ROUTES.CHECKLISTS);
    return response.data;
  },
  detail: async (id: string) => {
    const response = await api.get<Checklist>(API_ROUTES.CHECKLIST_DETAIL(id));
    return response.data;
  },
  create: async (payload: ChecklistPayload) => {
    const response = await api.post<Checklist>(API_ROUTES.CHECKLISTS, payload);
    return response.data;
  },
  update: async (id: string, payload: ChecklistUpdatePayload) => {
    const response = await api.put<Checklist>(API_ROUTES.CHECKLIST_DETAIL(id), payload);
    return response.data;
  },
  remove: async (id: string) => {
    await api.delete(API_ROUTES.CHECKLIST_DETAIL(id));
  },
};
