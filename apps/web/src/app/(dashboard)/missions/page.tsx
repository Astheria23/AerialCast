"use client";

import { useCallback, useEffect, useMemo } from "react";

import { MissionFilters } from "@/components/missions/mission-filters";
import { MissionStatsCard } from "@/components/missions/mission-stats-card";
import { MissionsPageHeader } from "@/components/missions/missions-page-header";
import { MissionsList } from "@/components/missions/missions-list";
import { MissionFormDialog } from "@/components/missions/mission-form-dialog";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/auth.hooks";
import { useChecklists } from "@/hooks/checklists.hooks";
import { useDrones } from "@/hooks/drones.hooks";
import { useGeofences } from "@/hooks/geofences.hooks";
import { useMissions } from "@/hooks/missions/missions.hooks";
import { useMissionFilters } from "@/hooks/missions/use-mission-filters";
import { useMissionForm } from "@/hooks/missions/use-mission-form";
import { useMissionStatus } from "@/hooks/missions/use-mission-status";
import { useMissionCrud } from "@/hooks/missions/use-mission-crud";
import {
  canManageMissions,
  canPerformStatusAction,
  getVisibleMissions,
} from "@/lib/missions/mission-permissions.utils";
import type { Mission, MissionStatusAction } from "@/types/missions.types";

export default function MissionsPage() {
  const { user, isAdmin, isPilot } = useAuth();
  const permissionContext = useMemo(
    () => ({ user, isAdmin, isPilot }),
    [user, isAdmin, isPilot]
  );
  const { drones, fetchDrones } = useDrones();
  const { checklists, fetchChecklists } = useChecklists();
  const { geofences, fetchGeofences } = useGeofences();
  const {
    missions,
    loading,
    error,
    clearError,
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    changeMissionStatus,
  } = useMissions();
  const { toast } = useToast();

  // Form state management
  const {
    formMode,
    editingMission,
    formError,
    setFormError,
    isSubmitting,
    setIsSubmitting,
    isFormOpen,
    openCreateForm,
    openEditForm,
    closeForm,
  } = useMissionForm();

  // Permission checks
  const canManage = canManageMissions(permissionContext);
  const canTriggerStatusAction = canManageMissions(permissionContext);

  // CRUD handlers with unified error handling
  const { handleCreate, handleEdit, handleDelete } = useMissionCrud({
    createMission: async (payload) => {
      await createMission(payload);
    },
    updateMission: async (id, payload) => {
      await updateMission(id, payload);
    },
    deleteMission,
    canManage,
    setIsSubmitting,
    setFormError,
    onSuccess: (action, missionName) => {
      closeForm();
      const messages = {
        create: {
          title: "Mission created",
          desc: `${missionName} is ready to plan.`,
        },
        edit: {
          title: "Mission updated",
          desc: `${missionName} changes saved.`,
        },
        delete: {
          title: "Mission deleted",
          desc: "The mission has been removed from your list.",
        },
      };
      toast({
        title: messages[action].title,
        description: messages[action].desc,
      });
    },
    onError: (action, message) => {
      const titles = {
        create: "Unable to create mission",
        edit: "Unable to update mission",
        delete: "Unable to delete mission",
      };
      toast({
        variant: "destructive",
        title: titles[action],
        description: message,
      });
    },
  });

  // Status action management
  const {
    statusActionMissionId,
    statusActionError,
    setStatusActionError,
    handleStatusAction,
  } = useMissionStatus({
    onStatusChange: async (missionId, action) => {
      await changeMissionStatus(missionId, action);
      const mission = missions.find((m) => m.mission_id === missionId);
      toast({
        title: "Status updated",
        description: `${mission?.mission_name ?? "Mission"} is now ${
          action === "complete" ? "completed" : action
        }.`,
      });
    },
  });

  // Filter & search management
  const visibleMissions = useMemo(
    () => getVisibleMissions(missions, permissionContext),
    [missions, permissionContext]
  );
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    filteredMissions,
    statusCounts,
    hasFiltersApplied,
    resetFilters,
  } = useMissionFilters({ missions: visibleMissions });

  // Fetch initial data
  useEffect(() => {
    fetchMissions().catch(() => null);
  }, [fetchMissions]);

  useEffect(() => {
    fetchDrones().catch(() => null);
  }, [fetchDrones]);

  useEffect(() => {
    fetchChecklists().catch(() => null);
  }, [fetchChecklists]);

  useEffect(() => {
    fetchGeofences().catch(() => null);
  }, [fetchGeofences]);

  // Drone lookup map
  const droneLookup = useMemo(() => {
    const map: Record<string, string> = {};
    drones.forEach((drone) => {
      map[drone.drone_id] = drone.name;
    });
    return map;
  }, [drones]);

  // CRUD handlers with permission check
  const handleCreateMission = useCallback(
    (payload: any) => handleCreate(payload),
    [handleCreate]
  );

  const handleEditMission = useCallback(
    (payload: any) => {
      if (editingMission) handleEdit(editingMission, payload);
    },
    [editingMission, handleEdit]
  );

  const handleDeleteMission = useCallback(
    (missionId: string) => handleDelete(missionId),
    [handleDelete]
  );

  const handleStatusActionWithPermissionCheck = useCallback(
    async (mission: Mission, action: MissionStatusAction) => {
      if (!canPerformStatusAction(mission, action, permissionContext)) {
        setStatusActionError(
          "You do not have permission to perform this action"
        );
        return;
      }
      try {
        await handleStatusAction(mission, action);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Status change failed",
          description:
            err instanceof Error
              ? err.message
              : "Failed to update mission status",
        });
      }
    },
    [permissionContext, handleStatusAction, setStatusActionError, toast]
  );

  // View state
  const isListEmpty = !loading && visibleMissions.length === 0;
  const noFilteredResults =
    visibleMissions.length > 0 && filteredMissions.length === 0;
  const hasMissions = visibleMissions.length > 0;
  const aggregatedError = statusActionError ?? error ?? null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <MissionsPageHeader
        canManage={canManage}
        onCreateClick={openCreateForm}
      />

      <MissionFormDialog
        open={isFormOpen && canManage}
        mode={formMode}
        editingMission={editingMission}
        drones={drones}
        checklists={checklists}
        geofences={geofences}
        isSubmitting={isSubmitting}
        formError={formError}
        onClose={closeForm}
        onSubmit={
          formMode === "create" ? handleCreateMission : handleEditMission
        }
      />

      <ErrorDialog
        open={Boolean(aggregatedError)}
        message={aggregatedError ?? undefined}
        onOpenChange={(open) => {
          if (!open) {
            setStatusActionError(null);
            clearError();
          }
        }}
      />

      {hasMissions && <MissionStatsCard statusCounts={statusCounts} />}

      {hasMissions && (
        <MissionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          hasFiltersApplied={hasFiltersApplied}
          onReset={resetFilters}
        />
      )}

      <MissionsList
        loading={loading}
        missions={missions}
        filteredMissions={filteredMissions}
        visibleMissions={visibleMissions}
        droneLookup={droneLookup}
        canManage={canManage}
        canTriggerStatusAction={canTriggerStatusAction}
        statusActionMissionId={statusActionMissionId}
        isSubmitting={isSubmitting}
        permissionContext={permissionContext}
        noFilteredResults={noFilteredResults}
        onCreateClick={openCreateForm}
        onEdit={openEditForm}
        onDelete={handleDeleteMission}
        onStatusAction={handleStatusActionWithPermissionCheck}
        canPerformAction={(mission, action) =>
          canPerformStatusAction(mission, action, permissionContext)
        }
        onResetFilters={resetFilters}
      />
    </div>
  );
}
