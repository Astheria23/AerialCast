"use client"

import { useEffect } from "react"
import { useDrones } from "@/hooks/drones.hooks"
import { useAuth } from "@/hooks/auth.hooks"
import { DroneCard } from "@/components/drones/drone-card"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import type { Drone } from "@/types/drones.types"

export default function DronesPage() {
  const { drones, loading, error, fetchDrones, deleteDrone } = useDrones()
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchDrones()
  }, [fetchDrones])

  const handleDelete = async (droneId: string) => {
    if (confirm("Are you sure you want to delete this drone?")) {
      try {
        await deleteDrone(droneId)
      } catch (err) {
        console.error("Failed to delete drone:", err)
      }
    }
  }

  const handleViewDetail = (drone: Drone) => {
    // You can add a modal or navigate to detail page
    console.log("View detail for drone:", drone)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drones</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your drone fleet
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Drone
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && drones.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading drones...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && drones.length === 0 && (
        <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No drones found</p>
            {isAdmin && (
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add your first drone
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Drones Grid */}
      {drones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drones.map((drone) => (
            <DroneCard
              key={drone.drone_id}
              drone={drone}
              onEdit={isAdmin ? () => console.log("Edit drone:", drone) : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}
