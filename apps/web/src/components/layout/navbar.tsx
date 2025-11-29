"use client"

import { User, Settings, LogOut, Menu, Shield, PillIcon as PilotIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "./sidebar-provider"

export default function Navbar() {
  const { toggleSidebar, role, setRole } = useSidebar()

  return (
    <header className="bg-background border-b border-border fixed top-0 right-0 left-0 z-50">
      <div className="flex items-center justify-between h-20 px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-sm font-bold text-accent-foreground">AC</span>
          </div> */}
          <span className="text-lg font-semibold">Aerialcast</span>
          <div className="ml-auto md:ml-4 px-3 py-1 rounded-full bg-sidebar text-xs font-medium text-sidebar-foreground">
            {role === "admin" ? (
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <PilotIcon className="w-3 h-3" />
                Pilot
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-sidebar-accent transition-colors">
              <User className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 w-4 h-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 w-4 h-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRole("pilot")}>
              <PilotIcon className="mr-2 w-4 h-4" />
              <span>Switch to Pilot</span>
              {role === "pilot" && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRole("admin")}>
              <Shield className="mr-2 w-4 h-4" />
              <span>Switch to Admin</span>
              {role === "admin" && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive">
              <LogOut className="mr-2 w-4 h-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}