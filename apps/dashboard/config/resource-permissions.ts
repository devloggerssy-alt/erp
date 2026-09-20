import type { PermissionKey } from "@devloggers/api-contracts"

export type ResourcePermissionSet = {
    create?: PermissionKey
    update?: PermissionKey
    delete?: PermissionKey
}

export const RESOURCE_PERMISSIONS: Record<string, ResourcePermissionSet> = {
    units: { create: "units.create", update: "units.update", delete: "units.delete" },
    "item-categories": { create: "itemCategories.create", update: "itemCategories.update", delete: "itemCategories.delete" },
    items: { create: "items.create", update: "items.update", delete: "items.delete" },
    "custom-fields": { create: "customFields.create", update: "customFields.update", delete: "customFields.delete" },
    tags: { create: "tags.create", update: "tags.update", delete: "tags.delete" },
    "item-relations": { create: "itemRelations.create", update: "itemRelations.update", delete: "itemRelations.delete" },
    "catalog-entities": { create: "catalogEntities.create", update: "catalogEntities.update", delete: "catalogEntities.delete" },
    "item-catalog-entities": { create: "itemCatalogEntities.create", update: "itemCatalogEntities.update", delete: "itemCatalogEntities.delete" },
    brands: { create: "brands.create", update: "brands.update", delete: "brands.delete" },
    warehouses: { create: "warehouses.create", update: "warehouses.update", delete: "warehouses.delete" },
    parties: { create: "parties.create", update: "parties.update", delete: "parties.delete" },
    "invoice-types": { create: "invoiceTypes.create", update: "invoiceTypes.update", delete: "invoiceTypes.delete" },
    cashboxes: { create: "cashboxes.create", update: "cashboxes.update", delete: "cashboxes.delete" },
    "bank-accounts": { create: "bankAccounts.create", update: "bankAccounts.update", delete: "bankAccounts.delete" },
    currencies: { create: "currencies.create", update: "currencies.update", delete: "currencies.delete" },
    "fiscal-periods": { create: "fiscalPeriods.create", update: "fiscalPeriods.update", delete: "fiscalPeriods.delete" },
    "document-sequences": { create: "documentSequences.create", update: "documentSequences.update", delete: "documentSequences.delete" },
    users: { create: "users.create", update: "users.update", delete: "users.delete" },
    roles: { create: "roles.create", update: "roles.update", delete: "roles.delete" },
    "chart-of-accounts": { create: "accounts.create", update: "accounts.update", delete: "accounts.delete" },
    payments: { create: "payments.create", update: "payments.update", delete: "payments.delete" },
    expenses: { create: "expenses.create", update: "expenses.update", delete: "expenses.delete" },
    "stock-counts": { create: "stockCounts.create" },
}
