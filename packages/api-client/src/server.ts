import "server-only"

import { cookies } from "next/headers"
import { createApi } from "./api"
import { AuthUser } from "@devloggers/api-contracts"

export async function getServerApi() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    return createApi({
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
        process.env.NEXT_PUBLIC_API_BASE_URL
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
