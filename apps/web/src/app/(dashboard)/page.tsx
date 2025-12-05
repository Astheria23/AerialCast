"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ListChecks, Map, MapPin, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/services/auth.service"

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
]

export default function Home() {
  const router = useRouter()

  const handleLogout = () => {
    authService.logout()
    router.push("/login")
  }

  return (
    <main className="flex min-h-screen flex-col gap-8 bg-background p-6 md:p-10">
      <section className="rounded-2xl border border-border bg-card/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Flight operations console</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Welcome to AerialCast</h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Coordinate autonomous missions, monitor airspace restrictions, and keep every pilot aligned from a single
              command deck.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.href} className="h-full border border-dashed">
              <CardHeader>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${card.accent}`}>
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
          )
        })}
      </section>
    </main>
  )
}