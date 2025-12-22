import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Mission } from "@/types/missions.types";

interface MissionDetailsCardProps {
  mission: Mission;
  droneLabel: string;
  pilotLabel: string;
}

export function MissionDetailsCard({
  mission,
  droneLabel,
  pilotLabel,
}: MissionDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mission details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Drone</p>
          <p className="font-medium">{droneLabel}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pilot</p>
          <p className="font-medium">{pilotLabel}</p>
        </div>
        {mission.notes && (
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm">{mission.notes}</p>
          </div>
        )}
        {mission.created_at && (
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">
              {new Date(mission.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
