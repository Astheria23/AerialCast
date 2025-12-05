"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/hooks/auth.hooks"

export default function LoginPage() {
  const router = useRouter()
  const { status, isAuthenticated } = useAuth()

  useEffect(() => {
    if (status === "authenticated" && isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, router, status])

  return (
    <AuthLayout
      title="Aerial Cast"
      subtitle="Drone Monitoring & Control Platform"
      alternateLink={{
        href: "/register",
        text: "Create account",
        question: "Don't have an account?",
      }}
    >
      <LoginForm />
    </AuthLayout>
  )
}
