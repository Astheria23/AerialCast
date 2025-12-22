import { MissionReplayPanel } from "@/components/telemetry/mission-replay-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TelemetryPoint } from "@/types/telemetry.types";
import React from "react";

interface CompletedMissionViewProps {
  missionId: string;
  completedLatestPoint?: TelemetryPoint;
  completedTrailError: string | null;
  loading: boolean;
}

export function CompletedMissionView({
  missionId,
  completedLatestPoint,
  completedTrailError,
  loading,
}: CompletedMissionViewProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Loading mission replay data...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (completedTrailError) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
          <p className="text-sm text-destructive">{completedTrailError}</p>
        </CardContent>
      </Card>
    );
  }

  return <MissionReplayPanel missionId={missionId} />;
}
