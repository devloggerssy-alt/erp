/**
 * Single source of truth for tenant database backup/export: which Prisma
 * models are included, and in what order.
 *
 * Load order = array order (parents before children). Wipe order = the
 * exact reverse (children before parents). See the design spec's "Model
 * list, load order, and special handling" section for the full dependency
 * reasoning — this file is that table made executable.
 */
export interface DatabaseBackupModelSpec {
    /** Prisma model name (PascalCase), exactly as it appears in schema.prisma. */
    model: string;
    /**
     * Self-referencing FK field name (e.g. 'parentId'). Rows are inserted
     * with this field forced to null, then patched in a second pass once
     * every row of the model exists — avoids sorting by hierarchy depth.
     */
    selfReferenceField?: string;
    /**
     * For the two join tables with no tenantId column of their own
     * (UserRole, RolePermission): the to-one relation field to filter/scope
     * through instead, e.g. 'user' → `{ user: { tenantId } }`.
     */
    scopeViaRelation?: string;
}

export const DATABASE_BACKUP_MODELS: DatabaseBackupModelSpec[] = [
    { model: 'Currency' },
    { model: 'ChartOfAccount', selfReferenceField: 'parentId' },
    { model: 'Unit' },
    { model: 'Brand' },
    { model: 'ItemCategory', selfReferenceField: 'parentId' },
    { model: 'CatalogEntity', selfReferenceField: 'parentId' },
    { model: 'Warehouse' },
    { model: 'FiscalPeriod' },
    { model: 'DocumentSequence' },
    { model: 'CodeSequence' },
    { model: 'TenantSetting' },
    { model: 'CustomField' },
    { model: 'Tag' },
    { model: 'Role' },
    { model: 'AppUser' },
    { model: 'SetupTask' },
    { model: 'File' },
    { model: 'FinancialSetting' },
    { model: 'Party' },
    { model: 'Cashbox' },
    { model: 'BankAccount' },
    { model: 'InvoiceType' },
    { model: 'PosSetting' },
    { model: 'Item' },
    { model: 'WarehouseItem' },
    { model: 'ItemCatalogEntity' },
    { model: 'ItemRelation' },
    { model: 'UserRole', scopeViaRelation: 'user' },
    { model: 'RolePermission', scopeViaRelation: 'role' },
    { model: 'AiConversation' },
    { model: 'AiMessage' },
    { model: 'StockBalance' },
    { model: 'OpeningBalanceSession' },
    { model: 'Invoice' },
    { model: 'Expense' },
    { model: 'Payment' },
    { model: 'StockCount' },
    { model: 'StockMovement' },
    { model: 'JournalEntry', selfReferenceField: 'reversalOfId' },
    { model: 'TagAssignment' },
    { model: 'CustomFieldValue' },
    { model: 'InvoiceLine' },
    { model: 'ExpenseItem' },
    { model: 'StockCountLine' },
    { model: 'JournalLine' },
    { model: 'OpeningBalanceSessionLine' },
    { model: 'PaymentAllocation' },
    { model: 'ReconciliationRun' },
];

/** 'ChartOfAccount' → 'chartOfAccount' — the Prisma Client delegate key for a model name. */
export function delegateKey(modelName: string): string {
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}
