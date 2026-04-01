import "server-only"
import { cookies } from "next/headers"
import { createApi } from "./api"
import type { AuthUser } from "./infra/token"

export async function getServerApi() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    return createApi(
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
}

export async function getServerUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies()
    const raw = cookieStore.get("auth_user")?.value
    if (!raw) return null
    try {
        return JSON.parse(decodeURIComponent(raw)) as AuthUser
    } catch {
        return null
    }
}
