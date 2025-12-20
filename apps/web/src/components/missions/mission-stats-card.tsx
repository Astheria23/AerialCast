import { MISSION_STATUSES } from "@/lib/missions/mission.constants";
import { formatStatusLabel } from "@/lib/missions/mission.utils";

interface MissionStatsCardProps {
  statusCounts: Record<string, number>;
}

export function MissionStatsCard({ statusCounts }: MissionStatsCardProps) {
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
      {MISSION_STATUSES.map((status) => (
        <div key={status} className="rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            {formatStatusLabel(status)}
          </p>
          <p className="text-2xl font-semibold">{statusCounts[status] ?? 0}</p>
        </div>
      ))}
    </div>
  );
}
