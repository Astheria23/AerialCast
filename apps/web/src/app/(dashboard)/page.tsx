"use client"

import { useRouter } from "next/navigation"

import { authService } from "@/services/auth.service"
import { Button } from "@/components/ui/button"

export default function Home() {
  const router = useRouter()
  const handleLogout = () => {
    authService.logout()
    router.push("/login")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to AerialCast</h1>
        <div className="flex justify-center gap-4">
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
      </div>
    </main>
  )
}