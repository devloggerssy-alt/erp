import type { SetupTaskType } from '@devloggers/db-prisma';
import type { BusinessSetupInspection } from '../services/business-setup-discovery.service';
import { SETUP_TASK_TYPES } from './setup-task-graph';

/** Maps a setup task type to the discovery area that proves it is done in the tenant's data. */
export const INSPECTION_KEY_BY_TASK_TYPE: Partial<Record<SetupTaskType, keyof BusinessSetupInspection>> = {
    CURRENCIES: 'currencies',
    CHART_OF_ACCOUNTS: 'chartOfAccounts',
    FINANCIAL_MAPPINGS: 'financialMappings',
    CASHBOXES: 'cashboxes',
    BANK_ACCOUNTS: 'bankAccounts',
    FISCAL_PERIOD: 'fiscalPeriods',
    DOCUMENT_SEQUENCES: 'documentSequences',
    WAREHOUSES: 'warehouses',
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    OPENING_CASH_BALANCES: 'openingCashBalances',
    OPENING_BANK_BALANCES: 'openingBankBalances',
    OPENING_RECEIVABLES: 'openingReceivables',
    OPENING_PAYABLES: 'openingPayables',
    OPENING_INVENTORY: 'openingInventory',
};

/**
 * Every task type whose state can be derived from existing tenant data — i.e.
 * everything except RECONCILIATION, which must actually run the Phase 7 stack.
 * When the user configures one of these through its normal CRUD page (or posts
 * opening balances through the session workflow), `GET /business-setup/state`
 * marks the task complete without the executable handler ever running.
 */
export const DISCOVERY_COMPLETABLE_TASK_TYPES: SetupTaskType[] = SETUP_TASK_TYPES.filter(
    (type) => type !== 'RECONCILIATION',
);

export function inspectionAreaFor(
    type: SetupTaskType,
    inspection: BusinessSetupInspection,
): BusinessSetupInspection[keyof BusinessSetupInspection] | undefined {
    const key = INSPECTION_KEY_BY_TASK_TYPE[type];
    return key ? inspection[key] : undefined;
}

export function isDiscoverablyComplete(type: SetupTaskType, inspection: BusinessSetupInspection): boolean {
    if (!DISCOVERY_COMPLETABLE_TASK_TYPES.includes(type)) return false;
    const area = inspectionAreaFor(type, inspection);
    return area?.classification === 'EXISTING';
}
