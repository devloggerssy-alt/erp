import { defineResource } from './resource.types'

export const stockLedgerResource = defineResource({
  key: 'stock-ledger',

  routes: {
    movements: '/stock-ledger/movements',
  },
})


