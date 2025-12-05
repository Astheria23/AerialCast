"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuth } from "@/hooks/auth.hooks"

export default function RegisterPage() {
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
        href: "/login",
        text: "Sign in",
        question: "Already have an account?",
      }}
    >
      <RegisterForm />
    </AuthLayout>
  )
}
