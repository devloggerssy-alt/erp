export const authResource = {
  key: 'auth',

  /** Full URL paths (leading slash) — used by api-client fetch calls */
  routes: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },

  /** Path segments (no leading slash) — used by NestJS @Controller / @Get */
  paths: {
    root: 'auth',
    login: 'login',
    logout: 'logout',
    me: 'me',
  },
} as const

