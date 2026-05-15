import { defineResource } from './resource.types'

export const inventoryResource = defineResource({
  key: 'inventory',

  routes: {
    balances: '/inventory/balances',
    openingBalances: '/inventory/opening-balances',
  },
})


