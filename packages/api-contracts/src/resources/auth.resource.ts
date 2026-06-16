import { defineResource } from './resource.types'

export const authResource = defineResource({
  key: 'auth',

  /** Full URL paths (leading slash) — used by api-client fetch calls */
  routes: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
  },

  
})

