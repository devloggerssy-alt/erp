import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

export type SetupAreaClassification = 'EMPTY' | 'PARTIAL' | 'EXISTING';

export interface SetupAreaCount {
    count: number;
    classification: SetupAreaClassification;
}

export interface BusinessSetupInspection {
    currencies: SetupAreaCount;
    chartOfAccounts: SetupAreaCount;
    financialMappings: { configuredSlots: number; classification: SetupAreaClassification };
    cashboxes: SetupAreaCount;
    bankAccounts: SetupAreaCount;
    fiscalPeriods: SetupAreaCount;
    documentSequences: SetupAreaCount;
    warehouses: SetupAreaCount;
    products: SetupAreaCount;
    customers: SetupAreaCount;
    suppliers: SetupAreaCount;
    openingCashBalances: SetupAreaCount;
    openingBankBalances: SetupAreaCount;
    openingReceivables: SetupAreaCount;
    openingPayables: SetupAreaCount;
    openingInventory: SetupAreaCount;
}

const FINANCIAL_SETTING_SLOTS = [
    'defaultSalesAccountId', 'defaultPurchaseAccountId', 'defaultTaxAccountId',
    'defaultReceivableAccountId', 'defaultPayableAccountId', 'defaultInventoryAccountId',
    'defaultCogsAccountId', 'defaultInventoryAdjustmentAccountId', 'defaultOpeningEquityAccountId',
    'defaultCashAccountId', 'defaultBankAccountId',
] as const;

function classify(count: number): SetupAreaClassification {
    return count > 0 ? 'EXISTING' : 'EMPTY';
}

function toArea(count: number): SetupAreaCount {
    return { count, classification: classify(count) };
}

@Injectable()
export class BusinessSetupDiscoveryService {
    constructor(private readonly prisma: PrismaService) {}

    async inspect(tenantId: string): Promise<BusinessSetupInspection> {
        const [
            currencyCount, chartOfAccountCount, financialSetting, cashboxCount, bankAccountCount,
            fiscalPeriodCount, documentSequenceCount, warehouseCount, itemCount,
            customerCount, supplierCount, openingCashCount, openingBankCount,
            openingPartyLines, openingInventoryCount,
        ] = await Promise.all([
            this.prisma.currency.count({ where: { tenantId } }),
            this.prisma.chartOfAccount.count({ where: { tenantId } }),
            this.prisma.financialSetting.findUnique({ where: { tenantId } }),
            this.prisma.cashbox.count({ where: { tenantId } }),
            this.prisma.bankAccount.count({ where: { tenantId } }),
            this.prisma.fiscalPeriod.count({ where: { tenantId } }),
            this.prisma.documentSequence.count({ where: { tenantId } }),
            this.prisma.warehouse.count({ where: { tenantId } }),
            this.prisma.item.count({ where: { tenantId } }),
            this.prisma.party.count({ where: { tenantId, type: { in: ['CUSTOMER', 'CUSTOMER_SUPPLIER'] } } }),
            this.prisma.party.count({ where: { tenantId, type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } } }),
            this.prisma.journalLine.count({ where: { tenantId, cashboxId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
            this.prisma.journalLine.count({ where: { tenantId, bankAccountId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
            this.prisma.journalLine.findMany({
                where: { tenantId, partyId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } },
                select: { accountId: true, party: { select: { receivableAccountId: true, payableAccountId: true } } },
            }),
            this.prisma.stockMovement.count({ where: { tenantId, movementType: 'OPENING' } }),
        ]);

        const configuredSlots = financialSetting
            ? FINANCIAL_SETTING_SLOTS.filter((slot) => Boolean((financialSetting as Record<string, unknown>)[slot])).length
            : 0;
        const financialMappingsClassification: SetupAreaClassification =
            configuredSlots === 0 ? 'EMPTY' : configuredSlots === FINANCIAL_SETTING_SLOTS.length ? 'EXISTING' : 'PARTIAL';

        const openingReceivablesCount = openingPartyLines.filter((line) => {
            const resolvedAccountId = line.party?.receivableAccountId ?? financialSetting?.defaultReceivableAccountId ?? null;
            return resolvedAccountId !== null && line.accountId === resolvedAccountId;
        }).length;
        const openingPayablesCount = openingPartyLines.filter((line) => {
            const resolvedAccountId = line.party?.payableAccountId ?? financialSetting?.defaultPayableAccountId ?? null;
            return resolvedAccountId !== null && line.accountId === resolvedAccountId;
        }).length;

        return {
            currencies: toArea(currencyCount),
            chartOfAccounts: toArea(chartOfAccountCount),
            financialMappings: { configuredSlots, classification: financialMappingsClassification },
            cashboxes: toArea(cashboxCount),
            bankAccounts: toArea(bankAccountCount),
            fiscalPeriods: toArea(fiscalPeriodCount),
            documentSequences: toArea(documentSequenceCount),
            warehouses: toArea(warehouseCount),
            products: toArea(itemCount),
            customers: toArea(customerCount),
            suppliers: toArea(supplierCount),
            openingCashBalances: toArea(openingCashCount),
            openingBankBalances: toArea(openingBankCount),
            openingReceivables: toArea(openingReceivablesCount),
            openingPayables: toArea(openingPayablesCount),
            openingInventory: toArea(openingInventoryCount),
        };
    }
}
