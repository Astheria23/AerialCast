"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  Plane,
  MapPin,
  ListChecks,
  Wrench,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/auth.hooks";

interface SidebarProps {
  className?: string;
}

const pilotNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/missions", label: "Mission", icon: Zap },
  { href: "/checklists", label: "Checklists", icon: ListChecks },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/drones", label: "Drone", icon: Plane },
  { href: "/geofences", label: "Geofences", icon: MapPin },
];

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/missions", label: "Mission", icon: Zap },
  { href: "/checklists", label: "Checklists", icon: ListChecks },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/drones", label: "Drone", icon: Plane },
  { href: "/geofences", label: "Geofences", icon: MapPin },
];

export function Sidebar({ className }: SidebarProps) {
  const { isAdmin } = useAuth();
  const navItems = isAdmin ? adminNavItems : pilotNavItems;
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const logoSrc = isCollapsed
    ? "/images/aerialcast-icon.svg"
    : isDark
    ? "/images/aerialcast-logo-white.svg"
    : "/images/aerialcast-logo.svg";

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col bg-card border-r border-border transition-all duration-300 ease-in-out sticky top-0 left-0 z-50",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Toggle Hide and Show Sidebar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 h-6 w-6 flex items-center justify-center rounded-full border bg-card shadow-sm hover:bg-secondary transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Logo Section */}
      <div
        className={cn(
          "flex items-center pb-8 pt-6 transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "justify-start px-6"
        )}
      >
        <div className="flex items-center gap-2 shrink-0 overflow-hidden">
          <img
            src={logoSrc}
            alt="Logo"
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "w-10 h-10 object-contain" : "w-32"
            )}
          />
        </div>
      </div>

      {/* Top Menu */}
      <nav className="flex-1 space-y-1 px-3 overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                isCollapsed ? "justify-center px-0" : "px-3"
              )}
              title={isCollapsed ? item.label : ""}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300 origin-left",
                  isCollapsed
                    ? "opacity-0 w-0 hidden"
                    : "opacity-100 w-auto block"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Menu */}
      <div className="space-y-1 px-3 pb-4">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-all",
            isCollapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="transition-all">Log out</span>}
        </button>
      </div>
    </aside>
  );
}
