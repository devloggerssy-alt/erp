import { authResource } from './auth.resource'
import { tenantResource } from './tenant.resource'
import { userResource } from './user.resource'
import { roleResource } from './role.resource'
import { currencyResource } from './currency.resource'
import { fiscalPeriodResource } from './fiscal-period.resource'
import { documentSequenceResource } from './document-sequence.resource'
import { unitResource } from './unit.resource'
import { itemCategoryResource } from './item-category.resource'
import { itemResource } from './item.resource'
import { partyResource } from './party.resource'
import { warehouseResource } from './warehouse.resource'
import { inventoryResource } from './inventory.resource'
import { stockLedgerResource } from './stock-ledger.resource'
import { invoiceTypeResource } from './invoice-type.resource'
import { invoiceResource } from './invoice.resource'
import { cashboxResource } from './cashbox.resource'
import { paymentResource } from './payment.resource'
import { accountingResource } from './accounting.resource'
import { stockCountResource } from './stock-count.resource'
import { reportResource } from './report.resource'
import { dashboardResource } from './dashboard.resource'
import { aiResource } from './ai.resource'
import { auditResource } from './audit.resource'

export * from './auth.resource'
export * from './tenant.resource'
export * from './user.resource'
export * from './role.resource'
export * from './currency.resource'
export * from './fiscal-period.resource'
export * from './document-sequence.resource'
export * from './unit.resource'
export * from './item-category.resource'
export * from './item.resource'
export * from './party.resource'
export * from './warehouse.resource'
export * from './inventory.resource'
export * from './stock-ledger.resource'
export * from './invoice-type.resource'
export * from './invoice.resource'
export * from './cashbox.resource'
export * from './payment.resource'
export * from './accounting.resource'
export * from './stock-count.resource'
export * from './report.resource'
export * from './dashboard.resource'
export * from './ai.resource'
export * from './audit.resource'

export const resources = {
  auth: authResource,
  tenants: tenantResource,
  users: userResource,
  roles: roleResource,
  currencies: currencyResource,
  fiscalPeriods: fiscalPeriodResource,
  documentSequences: documentSequenceResource,
  units: unitResource,
  itemCategories: itemCategoryResource,
  items: itemResource,
  parties: partyResource,
  warehouses: warehouseResource,
  inventory: inventoryResource,
  stockLedger: stockLedgerResource,
  invoiceTypes: invoiceTypeResource,
  invoices: invoiceResource,
  cashboxes: cashboxResource,
  payments: paymentResource,
  accounting: accountingResource,
  stockCounts: stockCountResource,
  reports: reportResource,
  dashboard: dashboardResource,
  ai: aiResource,
  auditLogs: auditResource,
} as const
