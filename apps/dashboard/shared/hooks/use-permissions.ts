"use client"

import type { PermissionKey } from "@devloggers/api-contracts"
import { useAuthStore } from "@/shared/stores/auth-store"

const NO_PERMISSIONS: readonly PermissionKey[] = []

/**
 * Cosmetic UI gating only — the API is the enforcement point.
 * Permissions come from the `auth_user` cookie, refreshed by login and
 * `refreshUserCookie()` after onboarding.
 */
export function usePermissions() {
    const user = useAuthStore((state) => state.user)
    const permissions = user?.permissions ?? NO_PERMISSIONS

    const can = (permission: PermissionKey) => permissions.includes(permission)
    const canAny = (...required: PermissionKey[]) => required.some(can)

    return { permissions, can, canAny }
}
