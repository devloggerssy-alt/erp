"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/shared/stores/auth-store"

/**
 * Hydrates auth state from server cookies on mount and exposes auth helpers.
 */
export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    store.hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    token: store.token,
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    login: store.login,
    logout: store.logout,
  }
}
