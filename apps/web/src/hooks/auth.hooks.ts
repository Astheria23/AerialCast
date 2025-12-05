import { useMemo, useState } from "react"
import { authService } from "@/services/auth.service"
import type { User } from "@/types/auth.types"

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => authService.getUser())
  const [loading, setLoading] = useState(false)

  const isAdmin = user?.role === "admin"
  const isPilot = user?.role === "pilot"

  const refreshUser = () => {
    setLoading(true)
    const currentUser = authService.getUser()
    setUser(currentUser)
    setLoading(false)
  }

  return useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isPilot,
      refreshUser,
    }),
    [isAdmin, isPilot, loading, user],
  )
}
