import { TelemetryMap } from "@/components/telemetry/telemetry-map";
import type { TelemetryMapHandle } from "@/components/telemetry/telemetry-map";
import { TelemetryVitals } from "@/components/telemetry/telemetry-vitals";
import { TelemetryEventFeed } from "@/components/telemetry/telemetry-event-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type {
  TelemetryPoint,
  TelemetryEventItem,
  TelemetryStatsSummary,
} from "@/types/telemetry.types";
import type { MissionWaypoint } from "@/types/missions.types";
import { computeStats } from "@/hooks/telemetry.hooks";

interface LiveMissionViewProps {
  mapRef: React.RefObject<TelemetryMapHandle | null>;
  points: TelemetryPoint[];
  latestPoint: TelemetryPoint | null;
  waypoints: MissionWaypoint[];
  events: TelemetryEventItem[];
  alerts: TelemetryEventItem[];
  droneId: string;
}

export function LiveMissionView({
  mapRef,
  points,
  latestPoint,
  waypoints,
  events,
  alerts,
  droneId,
}: LiveMissionViewProps) {
  const latestPoints = points.slice(-6).reverse();
  const alertEvents = alerts;
  const stats = computeStats(points);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Live telemetry map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] w-full">
              <TelemetryMap
                ref={mapRef}
                trail={points}
                waypoints={waypoints}
                latestPoint={latestPoint ?? undefined}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event feed</CardTitle>
          </CardHeader>
          <CardContent>
            <TelemetryEventFeed events={events} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {latestPoint && (
          <TelemetryVitals stats={stats} latestPoint={latestPoint} />
        )}

        {alertEvents.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Active alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {alertEvents.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {alert.summary}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {alert.severity?.toUpperCase()}
                      </span>
                    </div>
                    {alert.details && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alert.details}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent telemetry</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPoints.length > 0 ? (
              <div className="space-y-2">
                {latestPoints.map((point, idx) => (
                  <div
                    key={`${point.latitude}-${point.longitude}-${idx}`}
                    className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {point.altitude?.toFixed(1)}m alt
                      </span>
                      <span className="text-muted-foreground">
                        {point.battery_voltage &&
                        typeof point.battery_voltage === "number"
                          ? `${((point.battery_voltage / 12.6) * 100).toFixed(
                              0
                            )}%`
                          : "N/A"}{" "}
                        bat
                      </span>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {new Date(
                        point.recorded_at ?? point.time ?? ""
                      ).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No telemetry data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
