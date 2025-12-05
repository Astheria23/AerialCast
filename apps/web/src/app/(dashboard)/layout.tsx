"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Sidebar from "@/components/layout/sidebar"
import { SidebarProvider } from "@/components/layout/sidebar-provider"
import { authService } from "@/services/auth.service"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const isLoggedIn = useMemo(() => !!authService.getUser(), [])

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn) {
    return null
  }

  return (
    <SidebarProvider>
      <Navbar />
      <Sidebar />
      <main
        className="mt-20 bg-background transition-all duration-300 ease-in-out"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </SidebarProvider>
  )
}