import { defineResource } from './resource.types'

export const accountOpeningBalanceResource = defineResource({
  key: 'account-opening-balances',

  routes: {
    post: '/accounting/opening-balances',
  },
})
