import { useCallback, useState } from "react"

import { getFriendlyErrorMessage } from "@/lib/errors"
import { dronesService } from "@/services/drones.service"
import type { CreateDronePayload, Drone, UpdateDronePayload } from "@/types/drones.types"

export const useDrones = () => {
  const [drones, setDrones] = useState<Drone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  const fetchDrones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dronesService.getDrones()
      setDrones(data)
      return data
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to fetch drones")
      setError(message)
      console.error("Error fetching drones:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDroneById = useCallback(async (droneId: string) => {
    try {
      setLoading(true)
      setError(null)
      return await dronesService.getDroneById(droneId)
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to fetch drone")
      setError(message)
      console.error("Error fetching drone:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createDrone = useCallback(async (payload: CreateDronePayload) => {
    try {
      setLoading(true)
      setError(null)
      const created = await dronesService.createDrone(payload)
      setDrones((prev) => [...prev, created])
      return created
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to create drone")
      setError(message)
      console.error("Error creating drone:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateDrone = useCallback(async (droneId: string, payload: UpdateDronePayload) => {
    try {
      setLoading(true)
      setError(null)
      const updated = await dronesService.updateDrone(droneId, payload)
      setDrones((prev) => prev.map((drone) => (drone.drone_id === droneId ? updated : drone)))
      return updated
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to update drone")
      setError(message)
      console.error("Error updating drone:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteDrone = useCallback(async (droneId: string) => {
    try {
      setLoading(true)
      setError(null)
      await dronesService.deleteDrone(droneId)
      setDrones((prev) => prev.filter((drone) => drone.drone_id !== droneId))
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to delete drone")
      setError(message)
      console.error("Error deleting drone:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    drones,
    loading,
    error,
    clearError,
    fetchDrones,
    fetchDroneById,
    createDrone,
    updateDrone,
    deleteDrone,
  }
}
