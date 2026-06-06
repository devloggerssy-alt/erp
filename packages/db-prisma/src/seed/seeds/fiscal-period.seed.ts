import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedFiscalPeriod(prisma: PrismaClient, tenantId: string): Promise<void> {
    const year = new Date().getFullYear()
    await prisma.fiscalPeriod.create({
        data: {
            id: SEED_IDS.FISCAL_PERIOD_2026,
            tenantId,
            name: String(year),
            startDate: new Date(`${year}-01-01`),
            endDate: new Date(`${year}-12-31`),
            status: 'OPEN',
        },
    })
}
