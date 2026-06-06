import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedJournalEntry(prisma: PrismaClient, tenantId: string): Promise<void> {
    const year = new Date().getFullYear()
    await prisma.journalEntry.create({
        data: {
            id: SEED_IDS.JOURNAL_OPENING,
            tenantId,
            number: 'JE-00001',
            date: new Date(`${year}-01-01`),
            fiscalPeriodId: SEED_IDS.FISCAL_PERIOD_2026,
            referenceType: 'opening',
            description: 'Opening balance entry',
            status: 'POSTED',
            postedAt: new Date(`${year}-01-01`),
            createdBy: 'seed',
            lines: {
                create: [
                    { tenantId, accountId: SEED_IDS.ACCT_1110_CASH,          debit: 5000000,  credit: 0,        description: 'Opening cash balance',      sortOrder: 1 },
                    { tenantId, accountId: SEED_IDS.ACCT_1130_INVENTORY,     debit: 10000000, credit: 0,        description: 'Opening inventory balance', sortOrder: 2 },
                    { tenantId, accountId: SEED_IDS.ACCT_3100_OWNER_EQUITY,  debit: 0,        credit: 15000000, description: "Opening owner's equity",    sortOrder: 3 },
                ],
            },
        },
    })
}
