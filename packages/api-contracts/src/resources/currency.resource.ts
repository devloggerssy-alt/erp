export const currencyResource = {
  key: 'currencies',

  routes: {
    list: '/currencies',
    create: '/currencies',
    update: '/currencies/:id',
  },

  paths: {
    root: 'currencies',
    byId: ':id',
  },
} as const
