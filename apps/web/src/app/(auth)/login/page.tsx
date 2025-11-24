"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      router.push("/")
    }
  }, [router])

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
