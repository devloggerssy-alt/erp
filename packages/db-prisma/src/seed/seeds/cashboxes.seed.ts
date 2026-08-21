import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedCashboxes(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.cashbox.create({
            data: {
                id: SEED_IDS.CASHBOX_SYP,
                tenantId,
                code: 'CASH-SYP',
                name: { ar: 'الصندوق الرئيسي (ل.س)', en: 'Main Cash (SYP)' },
                currencyId: SEED_IDS.CURRENCY_SYP,
            },
        }),
        prisma.cashbox.create({
            data: {
                id: SEED_IDS.CASHBOX_USD,
                tenantId,
                code: 'CASH-USD',
                name: { ar: 'صندوق الدولار الأمريكي', en: 'USD Cash Box' },
                currencyId: SEED_IDS.CURRENCY_USD,
            },
        }),
    ])
}
