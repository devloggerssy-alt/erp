import type { PrismaClient } from '../../../generated/client'
import { CurrenciesSeedData } from '../data/currencies'
import { SEED_IDS } from '../seed-ids'

export async function seedCurrencies(prisma: PrismaClient, tenantId: string): Promise<void> {
    await prisma.currency.createMany({
        data: CurrenciesSeedData.map(c => ({ ...c, tenantId })),
    })

    await prisma.tenant.update({
        where: { id: tenantId },
        data: { baseCurrencyId: SEED_IDS.CURRENCY_USD },
    })
}
