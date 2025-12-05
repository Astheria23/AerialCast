"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Sidebar from "@/components/layout/sidebar"
import { SidebarProvider } from "@/components/layout/sidebar-provider"
import { useAuth } from "@/hooks/auth.hooks"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const { status, isAuthenticated } = useAuth()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [router, status])

  if (status === "idle" || status === "loading" || !isAuthenticated) {
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