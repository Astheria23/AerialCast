"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { isAxiosError } from "axios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"

type ApiErrorResponse = {
  message?: string
  error?: string
}

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.response?.data?.error ?? fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      await authService.login({ email, password })
      router.push("/")
    } catch (err) {
      setError(getAuthErrorMessage(err, "Login failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-foreground">Welcome Back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your Aerial Cast account</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="border-border bg-background focus:border-primary focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-foreground">
            Password
          </Label>
          <Link href="/auth/forgot-password" className="text-xs text-primary transition-colors hover:text-accent">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="border-border bg-background focus:border-primary focus:ring-primary"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input id="remember" type="checkbox" className="h-4 w-4 cursor-pointer rounded border border-border bg-background accent-primary" />
        <Label htmlFor="remember" className="text-sm text-muted-foreground">
          Remember me
        </Label>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-auto w-full bg-linear-to-r from-primary to-accent py-2.5 font-semibold text-primary-foreground hover:opacity-90"
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
    </form>
  )
}
