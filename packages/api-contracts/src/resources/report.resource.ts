import { defineResource } from './resource.types'

export const reportResource = defineResource({
  key: 'reports',

  routes: {
    stockBalance: '/reports/stock-balance',
    salesSummary: '/reports/sales-summary',
    purchaseSummary: '/reports/purchase-summary',
    customerStatement: '/reports/customer-statement',
    supplierStatement: '/reports/supplier-statement',
    profitSummary: '/reports/profit-summary',
  },
})


