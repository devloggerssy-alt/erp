"use client"

import { useSyncExternalStore } from "react"
import type { PermissionKey } from "@devloggers/api-contracts"
import { useAuthStore } from "@/shared/stores/auth-store"

const NO_PERMISSIONS: readonly PermissionKey[] = []

function subscribeNoop() {
    return () => {}
}

/**
 * Cosmetic UI gating only — the API is the enforcement point.
 * Permissions come from the `auth_user` cookie, refreshed by login and
 * `refreshUserCookie()` after onboarding.
 *
 * `useAuthStore`'s initial state is read from `document.cookie`, which is
 * always empty during SSR, so the store's real value is only known once this
 * hook has hydrated on the client. `useSyncExternalStore`'s server snapshot
 * reports "not hydrated" on both the server render and the client's matching
 * hydration render, then flips to the real client snapshot right after —
 * avoiding a hydration mismatch on permission-gated UI (e.g. the resource
 * "Add" button).
 */
export function usePermissions() {
    const isHydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)
    const user = useAuthStore((state) => state.user)

    const permissions = isHydrated ? (user?.permissions ?? NO_PERMISSIONS) : NO_PERMISSIONS

    const can = (permission: PermissionKey) => permissions.includes(permission)
    const canAny = (...required: PermissionKey[]) => required.some(can)

    return { permissions, can, canAny }
}
