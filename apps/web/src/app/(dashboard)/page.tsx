"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Activity,
  ClipboardCheck,
  ListChecks,
  Loader2,
  Map,
  MapPin,
  Plane,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/auth.hooks";
import { useChecklists } from "@/hooks/checklists.hooks";
import { useDrones } from "@/hooks/drones.hooks";
import { useGeofences } from "@/hooks/geofences.hooks";
import { useMissions } from "@/hooks/missions/missions.hooks";
import { authService } from "@/services/auth.service";

const quickLinks = [
  {
    title: "Plan missions",
    description: "Assign drones, plot waypoints, and manage approvals.",
    href: "/missions",
    icon: Zap,
    accent: "text-sky-500",
  },
  {
    title: "Manage geofences",
    description: "Draw safe corridors and no-fly boundaries on the map.",
    href: "/geofences",
    icon: MapPin,
    accent: "text-emerald-500",
  },
  {
    title: "Track checklists",
    description: "Enforce pre-flight and post-flight routines for teams.",
    href: "/checklists",
    icon: ListChecks,
    accent: "text-violet-500",
  },
  {
    title: "Monitor maintenance",
    description: "Log service history to keep the fleet airworthy.",
    href: "/maintenance",
    icon: Map,
    accent: "text-amber-500",
  },
];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { missions, loading: missionsLoading, fetchMissions } = useMissions();
  const { drones, loading: dronesLoading, fetchDrones } = useDrones();
  const { checklists, fetchChecklists } = useChecklists();
  const { geofences, fetchGeofences } = useGeofences();

  useEffect(() => {
    fetchMissions().catch(() => null);
    fetchDrones().catch(() => null);
    fetchChecklists().catch(() => null);
    fetchGeofences().catch(() => null);
  }, [fetchMissions, fetchDrones, fetchChecklists, fetchGeofences]);

  const userFirstName = useMemo(() => {
    if (user?.full_name) {
      return user.full_name.split(" ")[0];
    }
    if (user?.email) {
      return user.email;
    }
    return "Operator";
  }, [user]);

  const pendingMissions = useMemo(
    () =>
      missions.filter(
        (mission) => (mission.status ?? "").toUpperCase() === "PENDING_APPROVAL"
      ),
    [missions]
  );

  const activeMissions = useMemo(
    () =>
      missions.filter(
        (mission) => (mission.status ?? "").toUpperCase() === "IN_PROGRESS"
      ),
    [missions]
  );

  const latestPendingMissions = useMemo(() => {
    return [...pendingMissions]
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 4);
  }, [pendingMissions]);

  const readyDrones = useMemo(
    () =>
      drones.filter((drone) => (drone.status ?? "").toUpperCase() === "READY"),
    [drones]
  );

  const busyDrones = useMemo(
    () =>
      drones.filter((drone) => (drone.status ?? "").toUpperCase() !== "READY"),
    [drones]
  );

  const topReadyDrones = useMemo(() => readyDrones.slice(0, 5), [readyDrones]);

  const overviewStats = useMemo(
    () => [
      {
        title: "Total missions",
        value: missions.length,
        description: pendingMissions.length
          ? `${pendingMissions.length} awaiting approval`
          : "All missions reviewed",
        icon: Zap,
        accent: "bg-sky-500/10 text-sky-600",
      },
      {
        title: "Active missions",
        value: activeMissions.length,
        description: busyDrones.length
          ? `${busyDrones.length} drone(s) currently flying`
          : "No active flights",
        icon: Activity,
        accent: "bg-emerald-500/10 text-emerald-600",
      },
      {
        title: "Ready drones",
        value: readyDrones.length,
        description: `${drones.length} total airframes`,
        icon: Plane,
        accent: "bg-indigo-500/10 text-indigo-600",
      },
      {
        title: "Safety checklists",
        value: checklists.length,
        description: `${geofences.length} geofence(s) enforced`,
        icon: ClipboardCheck,
        accent: "bg-amber-500/10 text-amber-600",
      },
    ],
    [
      missions.length,
      pendingMissions.length,
      activeMissions.length,
      busyDrones.length,
      readyDrones.length,
      drones.length,
      checklists.length,
      geofences.length,
    ]
  );

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen flex-col gap-8 bg-background p-6 md:p-10">
      <section className="rounded-2xl border border-border bg-card/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">
              Flight operations console
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Welcome back, {userFirstName}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Track mission queues, fleet readiness, and safety coverage from
              this central mission control.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/missions" className="gap-2">
                Start planning
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Latest mission requests</CardTitle>
            <CardDescription>
              Open requests currently awaiting approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {missionsLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Fetching
                missions...
              </div>
            ) : latestPendingMissions.length > 0 ? (
              <ul className="space-y-3">
                {latestPendingMissions.map((mission) => {
                  const createdAt = mission.created_at
                    ? new Date(mission.created_at).toLocaleString()
                    : "—";
                  const droneLabel = mission.drone_name ?? mission.drone_id;
                  return (
                    <li
                      key={mission.mission_id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {mission.mission_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pilot {mission.pilot_name ?? "Unassigned"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Drone {droneLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {createdAt}
                        </p>
                      </div>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                        {(mission.status ?? "").replace(/_/g, " ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-card/50 p-4 text-sm text-muted-foreground">
                No pending missions at the moment. Use the button below to plan
                the next sortie.
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild variant="outline">
              <Link href="/missions">Manage missions</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Ready-to-fly drones</CardTitle>
            <CardDescription>
              Aircraft available for new assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dronesLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking drone
                status...
              </div>
            ) : topReadyDrones.length > 0 ? (
              <ul className="space-y-3">
                {topReadyDrones.map((drone) => (
                  <li
                    key={drone.drone_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {drone.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {drone.model}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      {drone.status ?? "READY"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-card/50 p-4 text-sm text-muted-foreground">
                No ready drones right now. Check maintenance status or active
                flight sessions.
              </div>
            )}
            {!dronesLoading && busyDrones.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {busyDrones.length} drone(s) currently busy or undergoing
                maintenance.
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild variant="outline">
              <Link href="/drones">Manage fleet</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${item.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.href} className="h-full border border-dashed">
              <CardHeader>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${card.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={card.href}>Go to {card.title.toLowerCase()}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
