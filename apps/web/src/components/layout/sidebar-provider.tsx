"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

import { authService } from "@/services/auth.service"

type UserRole = "pilot" | "admin"

interface SidebarContextType {
  isOpen: boolean
  toggleSidebar: () => void
  role: UserRole
  setRole: (role: UserRole) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [role, setRole] = useState<UserRole>("pilot")

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }
    document.documentElement.style.setProperty("--sidebar-width", isOpen ? "16rem" : "0rem")

    return () => {
      document.documentElement.style.removeProperty("--sidebar-width")
    }
  }, [isOpen])

  useEffect(() => {
    const user = authService.getUser()
    if (user?.role === "admin" || user?.role === "pilot") {
      queueMicrotask(() => setRole(user.role as UserRole))
    }
  }, [])

  const toggleSidebar = () => setIsOpen(!isOpen)

  return <SidebarContext.Provider value={{ isOpen, toggleSidebar, role, setRole }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}