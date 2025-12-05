"use client"

import { Button } from "@/components/ui/button"
import { useTelemetryContext } from "@/context/TelemetryContext"
import { useAuth } from "@/hooks/auth.hooks"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()
  const { connectionState, latestPoints } = useTelemetryContext()
  const activeSessions = Object.keys(latestPoints).length

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  return (
    <main className="flex min-h-screen flex-col gap-10 p-8">
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="text-4xl font-bold tracking-tight">Welcome to AerialCast</h1>
        <p className="text-muted-foreground">
          You&apos;re {isAuthenticated ? "signed in" : "not authenticated"}
          {user ? ` as ${user.full_name}` : ""}.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Telemetry connection</p>
          <p className="mt-2 text-2xl font-bold capitalize">{connectionState}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active sessions streaming: {activeSessions}
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="mt-2 text-2xl font-bold capitalize">{user?.role ?? "Unknown"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage access based on your profile
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Account</p>
          <p className="mt-2 text-lg font-semibold wrap-break-word">{user?.email ?? "No email"}</p>
          <Button onClick={handleLogout} variant="destructive" className="mt-4 w-full">
            Logout
          </Button>
        </div>
      </section>
    </main>
  )
}