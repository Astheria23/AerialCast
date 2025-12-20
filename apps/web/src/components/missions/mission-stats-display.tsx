import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MissionStatsDisplayProps {
  waypointCount: number;
  totalDistance?: number;
  estimatedDuration?: number;
}

export function MissionStatsDisplay({
  waypointCount,
  totalDistance,
  estimatedDuration,
}: MissionStatsDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mission statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Waypoints</p>
          <p className="text-2xl font-semibold">{waypointCount}</p>
        </div>
        {totalDistance !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground">Total distance</p>
            <p className="text-lg font-medium">{totalDistance.toFixed(2)} km</p>
          </div>
        )}
        {estimatedDuration !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground">Est. duration</p>
            <p className="text-lg font-medium">{estimatedDuration} min</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
