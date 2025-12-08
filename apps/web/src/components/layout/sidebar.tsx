"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Zap, Plane, MapPin, Users, ListChecks, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./sidebar-provider"

const pilotNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/missions", label: "Mission", icon: Zap },
  { href: "/checklists", label: "Checklists", icon: ListChecks },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/drones", label: "Drone", icon: Plane },
  { href: "/geofences", label: "Geofences", icon: MapPin },
]

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/missions", label: "Mission", icon: Zap },
  { href: "/checklists", label: "Checklists", icon: ListChecks },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/drones", label: "Drone", icon: Plane },
  { href: "/pilots", label: "Pilot", icon: Users },
  { href: "/geofences", label: "Geofences", icon: MapPin },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isOpen, role } = useSidebar()

  const navItems = role === "admin" ? adminNavItems : pilotNavItems

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-border h-screen fixed left-0 top-0 pt-20 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-0 overflow-hidden",
      )}
    >
      <nav className="space-y-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}