import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MissionCard } from "@/components/missions/mission-card";
import type { Mission, MissionStatusAction } from "@/types/missions.types";
import type { PermissionContext } from "@/lib/missions/mission-permissions.utils";

interface MissionsListProps {
  loading: boolean;
  missions: Mission[];
  filteredMissions: Mission[];
  visibleMissions: Mission[];
  droneLookup: Record<string, string>;
  canManage: boolean;
  canTriggerStatusAction: boolean;
  statusActionMissionId: string | null;
  isSubmitting: boolean;
  permissionContext: PermissionContext;
  noFilteredResults: boolean;
  onCreateClick: () => void;
  onEdit: (mission: Mission) => void;
  onDelete: (missionId: string) => void;
  onStatusAction: (mission: Mission, action: MissionStatusAction) => void;
  canPerformAction: (mission: Mission, action: MissionStatusAction) => boolean;
  onResetFilters: () => void;
}

export function MissionsList({
  loading,
  missions,
  filteredMissions,
  visibleMissions,
  droneLookup,
  canManage,
  canTriggerStatusAction,
  statusActionMissionId,
  isSubmitting,
  noFilteredResults,
  onCreateClick,
  onEdit,
  onDelete,
  onStatusAction,
  canPerformAction,
  onResetFilters,
}: MissionsListProps) {
  const isListEmpty = !loading && visibleMissions.length === 0;

  if (loading && missions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Loading missions...</p>
        </div>
      </div>
    );
  }

  if (isListEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
        <p className="text-muted-foreground">No missions yet</p>
        {canManage && (
          <Button className="mt-4 gap-2" onClick={onCreateClick}>
            <Plus className="h-4 w-4" />
            Create your first mission
          </Button>
        )}
      </div>
    );
  }

  if (noFilteredResults) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        <p>No missions match the current filters.</p>
        <Button
          type="button"
          variant="link"
          onClick={onResetFilters}
          className="text-primary"
        >
          Reset filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredMissions.map((mission) => (
        <MissionCard
          key={mission.mission_id}
          mission={mission}
          droneName={droneLookup[mission.drone_id]}
          onEdit={canManage ? onEdit : undefined}
          onDelete={canManage ? onDelete : undefined}
          onStatusAction={canTriggerStatusAction ? onStatusAction : undefined}
          canPerformAction={(action) => canPerformAction(mission, action)}
          disableActions={isSubmitting}
          isStatusUpdating={statusActionMissionId === mission.mission_id}
        />
      ))}
    </div>
  );
}
