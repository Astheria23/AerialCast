import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MISSION_STATUSES } from "@/lib/missions/mission.constants";
import { formatStatusLabel } from "@/lib/missions/mission.utils";
import type { MissionStatus } from "@/types/missions.types";

interface MissionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: MissionStatus | "ALL";
  onStatusFilterChange: (value: MissionStatus | "ALL") => void;
  sortOrder: "recent" | "oldest";
  onSortOrderChange: (value: "recent" | "oldest") => void;
  hasFiltersApplied: boolean;
  onReset: () => void;
}

export function MissionFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange,
  hasFiltersApplied,
  onReset,
}: MissionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" /> Mission filters
        {hasFiltersApplied && (
          <Button
            type="button"
            variant="link"
            onClick={onReset}
            className="h-auto p-0 text-primary"
          >
            Reset
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or notes"
            className="border-0 px-0 focus-visible:ring-0"
          />
        </div>
        <div className="flex w-full flex-1 flex-col gap-1">
          <label
            className="text-xs text-muted-foreground"
            htmlFor="status-filter"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as MissionStatus | "ALL")
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            {MISSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-1 flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="sort-order">
            Sort
          </label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) =>
              onSortOrderChange(e.target.value as "recent" | "oldest")
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>
    </div>
  );
}
