import { useCallback, useState } from 'react'

import { getFriendlyErrorMessage } from '@/lib/errors'
import { maintenanceService } from '@/services/maintenance.service'
import {
  CreateMaintenanceLogPayload,
  MaintenanceLog,
  UpdateMaintenanceLogPayload,
} from '@/types/maintenance.types'

export const useMaintenance = () => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [activeDroneId, setActiveDroneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  const fetchLogs = useCallback(async (droneId: string) => {
    try {
      setLoading(true)
      setError(null)
      setActiveDroneId(droneId)
      const data = await maintenanceService.getLogsByDrone(droneId)
      setLogs(data)
      return data
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to fetch maintenance logs')
      setError(message)
      console.error('Error fetching maintenance logs:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createLog = useCallback(async (droneId: string, payload: CreateMaintenanceLogPayload) => {
    try {
      setLoading(true)
      setError(null)
      const created = await maintenanceService.createLog(droneId, payload)
      if (activeDroneId === droneId) {
        setLogs((prev) => [created, ...prev])
      }
      return created
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to create maintenance log')
      setError(message)
      console.error('Error creating maintenance log:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [activeDroneId])

  const updateLog = useCallback(async (logId: string, payload: UpdateMaintenanceLogPayload) => {
    try {
      setLoading(true)
      setError(null)
      const updated = await maintenanceService.updateLog(logId, payload)
      setLogs((prev) => prev.map((log) => (log.log_id === logId ? updated : log)))
      return updated
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to update maintenance log')
      setError(message)
      console.error('Error updating maintenance log:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteLog = useCallback(async (logId: string) => {
    try {
      setLoading(true)
      setError(null)
      await maintenanceService.deleteLog(logId)
      setLogs((prev) => prev.filter((log) => log.log_id !== logId))
    } catch (err) {
  const message = getFriendlyErrorMessage(err, 'Failed to delete maintenance log')
      setError(message)
      console.error('Error deleting maintenance log:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    logs,
    activeDroneId,
    loading,
    error,
    clearError,
    fetchLogs,
    createLog,
    updateLog,
    deleteLog,
  }
}
