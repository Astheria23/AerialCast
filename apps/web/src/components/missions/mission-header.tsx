import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MissionStatusBadge } from "@/components/missions/mission-status-badge";
import type { Mission } from "@/types/missions.types";

interface MissionHeaderProps {
  mission: Mission | null;
  canStartMission: boolean;
  canEndMission: boolean;
  statusLoading: boolean;
  exporting: boolean;
  onStartMission: () => void;
  onEndMission: () => void;
  onExportPdf: () => void;
}

export function MissionHeader({
  mission,
  canStartMission,
  canEndMission,
  statusLoading,
  exporting,
  onStartMission,
  onEndMission,
  onExportPdf,
}: MissionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/missions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {mission?.mission_name ?? "Loading..."}
          </h1>
          {mission && (
            <MissionStatusBadge
              status={mission.status ?? "DRAFT"}
              className="mt-1"
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPdf}
          disabled={exporting || !mission}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export PDF
        </Button>
        {canStartMission && (
          <Button size="sm" onClick={onStartMission} disabled={statusLoading}>
            {statusLoading ? "Starting..." : "Start mission"}
          </Button>
        )}
        {canEndMission && (
          <Button size="sm" onClick={onEndMission} disabled={statusLoading}>
            {statusLoading ? "Ending..." : "End mission"}
          </Button>
        )}
      </div>
    </div>
  );
}
