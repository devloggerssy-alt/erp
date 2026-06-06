import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedCurrencies(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.currency.create({
            data: {
                id: SEED_IDS.CURRENCY_SYP,
                tenantId,
                code: 'SYP',
                name: { ar: 'الليرة السورية', en: 'Syrian Pound' },
                symbol: { ar: 'ل.س', en: '£' },
                isBase: true,
            },
        }),
        prisma.currency.create({
            data: {
                id: SEED_IDS.CURRENCY_USD,
                tenantId,
                code: 'USD',
                name: { ar: 'الدولار الأمريكي', en: 'US Dollar' },
                symbol: { ar: '$', en: '$' },
            },
        }),
    ])
}
