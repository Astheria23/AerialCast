"use client"

import Image from "next/image"
import Link from "next/link"
import { LogOut, Menu, PillIcon as PilotIcon, Shield, User } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { authService } from "@/services/auth.service"
import { useSidebar } from "./sidebar-provider"

export default function Navbar() {
  const { toggleSidebar, role } = useSidebar()

  const handleLogout = () => {
    authService.logout()
  }

  return (
    <header className="bg-background border-b border-border fixed top-0 right-0 left-0 z-50">
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center">
            <Image src="/images/aerialcast-logo.svg" alt="AerialCast" width={150} height={40} priority />
          </Link>
          <div className="ml-auto rounded-full bg-sidebar px-3 py-1 text-xs font-medium text-sidebar-foreground md:ml-4">
            {role === "admin" ? (
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <PilotIcon className="h-3 w-3" />
                Pilot
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent">
              <User className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}