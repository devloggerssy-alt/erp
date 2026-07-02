import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedFinancialSettings(prisma: PrismaClient, tenantId: string): Promise<void> {
    await prisma.financialSetting.upsert({
        where: { tenantId },
        create: {
            tenantId,
            defaultSalesAccountId:      SEED_IDS.ACCT_4100_SALES_REV,
            defaultPurchaseAccountId:   SEED_IDS.ACCT_5100_COGS,
            defaultTaxAccountId:        SEED_IDS.ACCT_2140_VAT,
            defaultReceivableAccountId: SEED_IDS.ACCT_1120_RECEIVABLE,
            defaultPayableAccountId:    SEED_IDS.ACCT_2110_PAYABLE,
            defaultInventoryAccountId:           SEED_IDS.ACCT_1130_INVENTORY,
            defaultCogsAccountId:                SEED_IDS.ACCT_5100_COGS,
            defaultInventoryAdjustmentAccountId: SEED_IDS.ACCT_5200_INV_ADJUSTMENT,
            defaultOpeningEquityAccountId:       SEED_IDS.ACCT_3300_OPENING_EQUITY,
        },
        update: {},
    })
}
