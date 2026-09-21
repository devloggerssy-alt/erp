import { resources } from '../resources'

export const PERMISSION_CATALOG = {
  users: ['view', 'create', 'update', 'delete'],
  roles: ['view', 'create', 'update', 'delete'],
  tenants: ['manage'],
  units: ['view', 'create', 'update', 'delete'],
  itemCategories: ['view', 'create', 'update', 'delete'],
  items: ['view', 'create', 'update', 'delete'],
  customFields: ['view', 'create', 'update', 'delete'],
  tags: ['view', 'create', 'update', 'delete'],
  tagAssignments: ['view', 'create', 'delete'],
  itemRelations: ['view', 'create', 'update', 'delete'],
  catalogEntities: ['view', 'create', 'update', 'delete'],
  itemCatalogEntities: ['view', 'create', 'update', 'delete'],
  brands: ['view', 'create', 'update', 'delete'],
  warehouses: ['view', 'create', 'update', 'delete'],
  inventory: ['view'],
  stockLedger: ['view'],
  stockCounts: ['view', 'create', 'post'],
  parties: ['view', 'create', 'update', 'delete'],
  invoiceTypes: ['view', 'create', 'update', 'delete'],
  invoices: ['view', 'create', 'update', 'post', 'cancel'],
  cashboxes: ['view', 'create', 'update', 'delete'],
  bankAccounts: ['view', 'create', 'update', 'delete'],
  payments: ['view', 'create', 'update', 'delete', 'post', 'cancel', 'allocate'],
  expenses: ['view', 'create', 'update', 'delete', 'post', 'cancel'],
  accounts: ['view', 'create', 'update', 'delete'],
  fiscalPeriods: ['view', 'create', 'update', 'delete'],
  documentSequences: ['view', 'create', 'update', 'delete'],
  currencies: ['view', 'create', 'update', 'delete'],
  financialSettings: ['manage'],
  openingBalanceSessions: ['view'],
  journals: ['view', 'post', 'reverse'],
  periods: ['close'],
  openingBalances: ['manage'],
  reconciliation: ['view', 'run'],
  reports: ['view'],
  dashboard: ['view'],
  auditLogs: ['view'],
  files: ['manage'],
  ai: ['view', 'use'],
  onboarding: ['manage'],
  businessSetup: ['manage'],
  settings: ['manage'],
  danger: ['reset'],
} as const

export type CatalogResource = keyof typeof PERMISSION_CATALOG

export type PermissionKey = {
  [R in CatalogResource]: `${R}.${(typeof PERMISSION_CATALOG)[R][number] & string}`
}[CatalogResource]

/**
 * Resources intentionally excluded from the catalog:
 * - `auth` — login/logout are public, `/auth/me` is authenticated-only.
 * - `accounting` — covered by `journals.*` and `reconciliation.*`.
 *
 * If a resource is added to the resources map and not catalogued above, this
 * type stops compiling — that is the intended tripwire.
 */
export type UncataloguedResource = Exclude<
  keyof typeof resources,
  CatalogResource | 'auth' | 'accounting'
>

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- compile-time assertion
const _assertCatalogComplete: UncataloguedResource extends never ? true : never = true

export const ALL_PERMISSIONS: readonly PermissionKey[] = Object.entries(PERMISSION_CATALOG).flatMap(
  ([resource, actions]) => actions.map((action) => `${resource}.${action}` as PermissionKey),
)

export const VIEW_PERMISSIONS: readonly PermissionKey[] = ALL_PERMISSIONS.filter((permission) =>
  permission.endsWith('.view'),
)

export const PERMISSION_GROUPS = {
  identity: ['users', 'roles', 'tenants'],
  catalog: [
    'units',
    'itemCategories',
    'items',
    'customFields',
    'tags',
    'tagAssignments',
    'itemRelations',
    'catalogEntities',
    'itemCatalogEntities',
    'brands',
  ],
  inventory: ['warehouses', 'inventory', 'stockLedger', 'stockCounts'],
  commercial: [
    'parties',
    'invoiceTypes',
    'invoices',
    'cashboxes',
    'bankAccounts',
    'payments',
    'expenses',
  ],
  accounting: [
    'accounts',
    'fiscalPeriods',
    'documentSequences',
    'currencies',
    'financialSettings',
    'openingBalanceSessions',
    'journals',
    'periods',
    'openingBalances',
    'reconciliation',
  ],
  reports: ['reports', 'dashboard'],
  system: ['auditLogs', 'files', 'ai', 'onboarding', 'businessSetup', 'settings', 'danger'],
} as const satisfies Record<string, readonly CatalogResource[]>

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS

export function permissionsForResource<R extends CatalogResource>(resource: R): PermissionKey[] {
  return PERMISSION_CATALOG[resource].map((action) => `${resource}.${action}` as PermissionKey)
}

export function permissionResource(key: PermissionKey): CatalogResource {
  return key.split('.')[0] as CatalogResource
}

export function permissionAction(key: PermissionKey): string {
  return key.split('.')[1] ?? ''
}

export function permissionGroup(key: PermissionKey): PermissionGroupKey {
  const resource = permissionResource(key)
  for (const group of Object.keys(PERMISSION_GROUPS) as PermissionGroupKey[]) {
    if ((PERMISSION_GROUPS[group] as readonly string[]).includes(resource)) return group
  }
  return 'system'
}
