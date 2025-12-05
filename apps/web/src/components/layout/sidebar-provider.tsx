"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

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
  }, [isOpen])

  const toggleSidebar = () => setIsOpen((prev) => !prev)

  return <SidebarContext.Provider value={{ isOpen, toggleSidebar, role, setRole }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}