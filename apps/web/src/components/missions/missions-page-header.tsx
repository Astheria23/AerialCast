import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";

interface MissionsPageHeaderProps {
  canManage: boolean;
  onCreateClick: () => void;
}

export function MissionsPageHeader({
  canManage,
  onCreateClick,
}: MissionsPageHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumbs
            items={[{ label: "Dashboard", href: "/" }, { label: "Missions" }]}
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Missions</h1>
            <p className="mt-1 text-muted-foreground">
              Plan and manage missions for your fleet
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/geofences">
                <MapPin className="h-4 w-4" />
                Manage geofences
              </Link>
            </Button>
            <Button className="gap-2" onClick={onCreateClick}>
              <Plus className="h-4 w-4" />
              Add mission
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>
          Missions respect the safe corridors and no-fly zones you define. Need
          to adjust boundaries before launching?
          <Link href="/geofences" className="ml-1 underline">
            Open geofences
          </Link>
          .
        </span>
      </div>

      {!canManage && (
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          You need an <span className="font-semibold">admin</span> or{" "}
          <span className="font-semibold">pilot</span> role to create, edit, or
          delete missions. If you believe this is an error, please contact an
          administrator.
        </div>
      )}
    </>
  );
}
