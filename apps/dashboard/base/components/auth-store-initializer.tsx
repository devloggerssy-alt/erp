"use client"

import { useRef } from "react"
import { useAuthStore } from "@/shared/stores/auth-store"
import type { AuthUser } from "@garage/api"

/**
 * Synchronously initializes the auth store from server-side token/user before
 * any child component renders. This avoids the first-render race condition where
 * useEffect-based hydration hasn't fired yet and API requests go out without a token.
 */
export function AuthStoreInitializer({ token, user }: { token: string; user: AuthUser }) {
    const initialized = useRef(false)
    if (!initialized.current) {
        initialized.current = true
        useAuthStore.setState({ token, user, isAuthenticated: true })
    }
    return null
}
