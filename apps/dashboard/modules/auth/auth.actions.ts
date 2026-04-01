"use server"

import { cookies } from "next/headers"
import type { AuthUser } from "@garage/api"

const TOKEN_COOKIE = "auth_token"
const USER_COOKIE = "auth_user"
const DEFAULT_EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days in seconds

export async function setAuthCookies(
    token: string,
    user: AuthUser,
    expiresIn: number = DEFAULT_EXPIRES_IN,
) {
    const cookieStore = await cookies()
    const expires = new Date(Date.now() + expiresIn * 1000)

    cookieStore.set(TOKEN_COOKIE, token, {
        expires,
        path: "/",
        sameSite: "strict",
    })

    cookieStore.set(USER_COOKIE, JSON.stringify(user), {
        expires,
        path: "/",
        sameSite: "strict",
    })
}

export async function clearAuthCookies() {
    const cookieStore = await cookies()
    cookieStore.delete(TOKEN_COOKIE)
    cookieStore.delete(USER_COOKIE)
}

export async function getAuthCookies(): Promise<{
    token: string | undefined
    user: AuthUser | undefined
}> {
    const cookieStore = await cookies()
    const token = cookieStore.get(TOKEN_COOKIE)?.value
    const rawUser = cookieStore.get(USER_COOKIE)?.value

    let user: AuthUser | undefined
    if (rawUser) {
        try {
            user = JSON.parse(rawUser) as AuthUser
        } catch {
            user = undefined
        }
    }

    return { token, user }
}
