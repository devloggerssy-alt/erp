import { Injectable } from '@nestjs/common';
import type { SetupTaskType } from '@devloggers/db-prisma';
import { SETUP_TASK_TYPES, SETUP_TASK_DEPENDENCIES, isTaskRequiredForProfile, type BusinessSetupProfileModules } from '../constants/setup-task-graph';
import type { BusinessSetupInspection } from './business-setup-discovery.service';

export interface SetupTaskPlanItem {
    type: SetupTaskType;
    required: boolean;
    dependencies: SetupTaskType[];
    metadata?: Record<string, unknown>;
}

const INSPECTION_KEY_BY_TASK_TYPE: Partial<Record<SetupTaskType, keyof BusinessSetupInspection>> = {
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

@Injectable()
export class BusinessSetupPlanService {
    generate(profile: BusinessSetupProfileModules, inspection: BusinessSetupInspection): SetupTaskPlanItem[] {
        return SETUP_TASK_TYPES.map((type) => {
            const inspectionKey = INSPECTION_KEY_BY_TASK_TYPE[type];
            return {
                type,
                required: isTaskRequiredForProfile(type, profile),
                dependencies: SETUP_TASK_DEPENDENCIES[type],
                metadata: inspectionKey ? { discovery: inspection[inspectionKey] } : undefined,
            };
        });
    }
}
