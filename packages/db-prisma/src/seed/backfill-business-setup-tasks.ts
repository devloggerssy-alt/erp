import 'dotenv/config'
import { PrismaClient, SetupTaskType, SetupTaskStatus } from '../../generated/client'
import type { Prisma } from '../../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Mirrors apps/api/src/modules/identity/business-setup/constants/setup-task-graph.ts.
 * packages/db-prisma cannot import from apps/api (wrong dependency direction,
 * .ai/rules/packages.md), so this one-time backfill keeps its own copy — keep
 * both in sync if the graph changes. Order matters: every dependency appears
 * before its dependents, so a single forward pass can resolve statuses.
 */
const SETUP_TASK_TYPES: SetupTaskType[] = [
    'CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES',
    'CASHBOXES', 'BANK_ACCOUNTS', 'WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS',
    'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'OPENING_RECEIVABLES', 'OPENING_PAYABLES',
    'OPENING_INVENTORY', 'RECONCILIATION',
]

const SETUP_TASK_DEPENDENCIES: Record<SetupTaskType, SetupTaskType[]> = {
    CURRENCIES: [], FISCAL_PERIOD: [], CHART_OF_ACCOUNTS: [], DOCUMENT_SEQUENCES: [], WAREHOUSES: [],
    FINANCIAL_MAPPINGS: ['CHART_OF_ACCOUNTS'],
    CASHBOXES: ['CURRENCIES'],
    BANK_ACCOUNTS: ['CURRENCIES'],
    PRODUCTS: ['WAREHOUSES'],
    CUSTOMERS: ['FINANCIAL_MAPPINGS'],
    SUPPLIERS: ['FINANCIAL_MAPPINGS'],
    OPENING_CASH_BALANCES: ['CASHBOXES', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_BANK_BALANCES: ['BANK_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_RECEIVABLES: ['CUSTOMERS', 'FISCAL_PERIOD'],
    OPENING_PAYABLES: ['SUPPLIERS', 'FISCAL_PERIOD'],
    OPENING_INVENTORY: ['PRODUCTS', 'WAREHOUSES', 'FISCAL_PERIOD'],
    RECONCILIATION: [
        'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS',
        'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES',
        'OPENING_RECEIVABLES', 'OPENING_PAYABLES', 'OPENING_INVENTORY',
    ],
}

const DEFAULT_PROFILE = { inventory: true, sales: true, purchasing: true, accounting: true }

async function inspectExistence(prisma: PrismaClient, tenantId: string): Promise<Record<SetupTaskType, boolean>> {
    const [
        currencyCount, chartOfAccountCount, financialSetting, cashboxCount, bankAccountCount,
        fiscalPeriodCount, documentSequenceCount, warehouseCount, itemCount,
        customerCount, supplierCount, openingCashCount, openingBankCount,
        openingPartyLines, openingInventoryCount,
    ] = await Promise.all([
        prisma.currency.count({ where: { tenantId } }),
        prisma.chartOfAccount.count({ where: { tenantId } }),
        prisma.financialSetting.findUnique({ where: { tenantId } }),
        prisma.cashbox.count({ where: { tenantId } }),
        prisma.bankAccount.count({ where: { tenantId } }),
        prisma.fiscalPeriod.count({ where: { tenantId } }),
        prisma.documentSequence.count({ where: { tenantId } }),
        prisma.warehouse.count({ where: { tenantId } }),
        prisma.item.count({ where: { tenantId } }),
        prisma.party.count({ where: { tenantId, type: { in: ['CUSTOMER', 'CUSTOMER_SUPPLIER'] } } }),
        prisma.party.count({ where: { tenantId, type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } } }),
        prisma.journalLine.count({ where: { tenantId, cashboxId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
        prisma.journalLine.count({ where: { tenantId, bankAccountId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
        prisma.journalLine.findMany({
            where: { tenantId, partyId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            select: { accountId: true, party: { select: { receivableAccountId: true, payableAccountId: true } } },
        }),
        prisma.stockMovement.count({ where: { tenantId, movementType: 'OPENING' } }),
    ])

    const financialMappingsConfigured = financialSetting
        ? [
            financialSetting.defaultSalesAccountId, financialSetting.defaultPurchaseAccountId,
            financialSetting.defaultTaxAccountId, financialSetting.defaultReceivableAccountId,
            financialSetting.defaultPayableAccountId,
        ].some(Boolean)
        : false;
    const openingReceivablesCount = openingPartyLines.filter((l) => l.party?.receivableAccountId === l.accountId).length;
    const openingPayablesCount = openingPartyLines.filter((l) => l.party?.payableAccountId === l.accountId).length;

    return {
        CURRENCIES: currencyCount > 0,
        CHART_OF_ACCOUNTS: chartOfAccountCount > 0,
        FINANCIAL_MAPPINGS: financialMappingsConfigured,
        CASHBOXES: cashboxCount > 0,
        BANK_ACCOUNTS: bankAccountCount > 0,
        FISCAL_PERIOD: fiscalPeriodCount > 0,
        DOCUMENT_SEQUENCES: documentSequenceCount > 0,
        WAREHOUSES: warehouseCount > 0,
        PRODUCTS: itemCount > 0,
        CUSTOMERS: customerCount > 0,
        SUPPLIERS: supplierCount > 0,
        OPENING_CASH_BALANCES: openingCashCount > 0,
        OPENING_BANK_BALANCES: openingBankCount > 0,
        OPENING_RECEIVABLES: openingReceivablesCount > 0,
        OPENING_PAYABLES: openingPayablesCount > 0,
        OPENING_INVENTORY: openingInventoryCount > 0,
        RECONCILIATION: false,
    };
}

function resolveStatus(
    type: SetupTaskType,
    existsMap: Record<SetupTaskType, boolean>,
    statusByType: Map<SetupTaskType, SetupTaskStatus>,
): SetupTaskStatus {
    if (existsMap[type]) return 'COMPLETED';
    const ready = SETUP_TASK_DEPENDENCIES[type].every((dep) => {
        const depStatus = statusByType.get(dep);
        return depStatus === 'COMPLETED' || depStatus === 'SKIPPED';
    });
    return ready ? 'READY' : 'BLOCKED';
}

async function backfillTenant(prisma: PrismaClient, tenantId: string): Promise<void> {
    const existingTaskCount = await prisma.setupTask.count({ where: { tenantId } });
    if (existingTaskCount > 0) return; // idempotent — already backfilled

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessSetupProfile: true } });
    if (!tenant?.businessSetupProfile) {
        await prisma.tenant.update({ where: { id: tenantId }, data: { businessSetupProfile: DEFAULT_PROFILE as unknown as Prisma.InputJsonValue } });
    }

    const existsMap = await inspectExistence(prisma, tenantId);
    const statusByType = new Map<SetupTaskType, SetupTaskStatus>();
    for (const type of SETUP_TASK_TYPES) {
        statusByType.set(type, resolveStatus(type, existsMap, statusByType));
    }

    await prisma.$transaction(
        SETUP_TASK_TYPES.map((type) =>
            prisma.setupTask.create({
                data: {
                    tenantId,
                    type,
                    status: statusByType.get(type) ?? 'BLOCKED',
                    required: true,
                    dependencies: SETUP_TASK_DEPENDENCIES[type],
                    completedAt: statusByType.get(type) === 'COMPLETED' ? new Date() : null,
                },
            }),
        ),
    );
}

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const tenants = await prisma.tenant.findMany({ select: { id: true } });
        for (const tenant of tenants) {
            await backfillTenant(prisma, tenant.id);
        }
        console.log(`Backfilled business-setup tasks for ${tenants.length} tenant(s).`);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

export const backfillBusinessSetupTasks = main
