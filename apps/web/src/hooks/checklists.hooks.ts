import { useCallback, useState } from 'react'

import { checklistsService } from '@/services/checklists.service'
import {
  Checklist,
  CreateChecklistPayload,
  UpdateChecklistPayload,
} from '@/types/checklists.types'

export const useChecklists = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChecklists = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await checklistsService.getChecklists()
      setChecklists(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch checklists'
      setError(message)
      console.error('Error fetching checklists:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChecklistById = useCallback(async (checklistId: string) => {
    try {
      setLoading(true)
      setError(null)
      return await checklistsService.getChecklistById(checklistId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch checklist'
      setError(message)
      console.error('Error fetching checklist:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createChecklist = useCallback(async (payload: CreateChecklistPayload) => {
    try {
      setLoading(true)
      setError(null)
      const created = await checklistsService.createChecklist(payload)
      setChecklists((prev) => [created, ...prev])
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checklist'
      setError(message)
      console.error('Error creating checklist:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateChecklist = useCallback(async (checklistId: string, payload: UpdateChecklistPayload) => {
    try {
      setLoading(true)
      setError(null)
      const updated = await checklistsService.updateChecklist(checklistId, payload)
      setChecklists((prev) => prev.map((checklist) => (checklist.checklist_id === checklistId ? updated : checklist)))
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update checklist'
      setError(message)
      console.error('Error updating checklist:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteChecklist = useCallback(async (checklistId: string) => {
    try {
      setLoading(true)
      setError(null)
      await checklistsService.deleteChecklist(checklistId)
      setChecklists((prev) => prev.filter((checklist) => checklist.checklist_id !== checklistId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete checklist'
      setError(message)
      console.error('Error deleting checklist:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    checklists,
    loading,
    error,
    fetchChecklists,
    fetchChecklistById,
    createChecklist,
    updateChecklist,
    deleteChecklist,
  }
}
