import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MissionForm,
  type MissionFormPayload,
} from "@/components/missions/mission-form";
import type { Mission } from "@/types/missions.types";
import type { Drone } from "@/types/drones.types";
import type { Checklist } from "@/types/checklists.types";
import type { Geofence } from "@/types/geofences.types";

interface MissionFormDialogProps {
  open: boolean;
  mode: "create" | "edit" | null;
  editingMission: Mission | null;
  drones: Drone[];
  checklists: Checklist[];
  geofences: Geofence[];
  isSubmitting: boolean;
  formError: string | null;
  onClose: () => void;
  onSubmit: (payload: MissionFormPayload) => void;
}

export function MissionFormDialog({
  open,
  mode,
  editingMission,
  drones,
  checklists,
  geofences,
  isSubmitting,
  formError,
  onClose,
  onSubmit,
}: MissionFormDialogProps) {
  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? `Edit ${editingMission?.mission_name ?? "mission"}`
              : "Create mission"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update mission metadata, drone assignments, and waypoints."
              : "Fill in mission details, assign a drone, and plot waypoints from the map."}
          </DialogDescription>
        </DialogHeader>
        <MissionForm
          key={mode === "edit" ? editingMission?.mission_id : "create"}
          drones={drones}
          checklists={checklists}
          geofences={geofences}
          mode={mode}
          initialData={editingMission ?? undefined}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </DialogContent>
    </Dialog>
  );
}
