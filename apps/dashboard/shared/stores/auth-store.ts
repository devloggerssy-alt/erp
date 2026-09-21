import { create } from "zustand"
import { AuthUser, type PermissionKey } from "@devloggers/api-contracts"
import {
  setAuthCookies,
  clearAuthCookies,
  getAuthCookies,
} from "@/modules/auth/auth.actions"

/**
 * Login/register responses come from the generated OpenAPI types, which declare
 * `permissions` as plain strings. The store narrows them to `PermissionKey` once,
 * at this boundary, so every consumer gets the Phase 9 typed permission union.
 */
export type AuthUserInput = Omit<AuthUser, "permissions"> & { permissions: string[] }

type AuthState = {
  token: string | undefined
  user: AuthUser | undefined
  isAuthenticated: boolean
}

type AuthActions = {
  login: (token: string, user: AuthUserInput, expiresIn?: number) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

/**
 * Synchronously read auth credentials from cookies on the client.
 * Returns undefined on the server (document is not available).
 */
function readCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function readInitialToken(): string | undefined {
  return readCookieValue("auth_token")
}

function readInitialUser(): AuthUser | undefined {
  const raw = readCookieValue("auth_user")
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return undefined
  }
}

const useAuthStore = create<AuthStore>()((set, get) => {
  const initialToken = readInitialToken()
  const initialUser = readInitialUser()

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!(initialToken && initialUser),

    login: async (token, user, expiresIn?) => {
      const normalized: AuthUser = { ...user, permissions: user.permissions as PermissionKey[] }
      await setAuthCookies(token, normalized, expiresIn)
      set({ token, user: normalized, isAuthenticated: true })
    },

    logout: async () => {
      const { token } = get()
      if (token) {
        try {
          await clearAuthCookies()
          set({ token: undefined, user: undefined, isAuthenticated: false })
        } catch {

          // proceed with local cleanup even if the API call fails
        }
      }
    },

    hydrate: async () => {
      const { token, user } = await getAuthCookies()
      if (token && user) {
        set({ token, user, isAuthenticated: true })
      } else {
        await clearAuthCookies()
        set({ token: undefined, user: undefined, isAuthenticated: false })
      }
    },
  }
})

export { useAuthStore }
export type { AuthUser }
