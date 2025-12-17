"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { authService } from "@/services/auth.service";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (!user) {
      router.replace("/auth");
      return;
    }
    queueMicrotask(() => setIsSessionReady(true));
  }, [router]);

  if (!isSessionReady) {
    return null;
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
  );
}
