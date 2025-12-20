import {
  formatStatusLabel,
  getStatusColor,
} from "@/lib/missions/mission.utils";
import type { MissionStatus } from "@/types/missions.types";

interface MissionStatusBadgeProps {
  status?: MissionStatus | string;
  className?: string;
}

export function MissionStatusBadge({
  status,
  className = "",
}: MissionStatusBadgeProps) {
  const statusClass = getStatusColor(status);
  const label = formatStatusLabel(status);

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass} ${className}`}
    >
      {label}
    </span>
  );
}
