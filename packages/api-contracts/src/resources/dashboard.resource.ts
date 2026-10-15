import { defineResource } from './resource.types'

export const dashboardResource = defineResource({
  key: 'dashboard',

  routes: {
    summary: '/dashboard/summary',
    chartData: '/dashboard/chart-data',
    expenseBreakdown: '/dashboard/expense-breakdown',
    topItems: '/dashboard/top-items',
  },
})


