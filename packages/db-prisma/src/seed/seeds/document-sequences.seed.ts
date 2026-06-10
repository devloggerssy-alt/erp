import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedDocumentSequences(prisma: PrismaClient, tenantId: string): Promise<void> {
    await prisma.documentSequence.createMany({
        data: [
            { id: SEED_IDS.DOC_SEQ_PURCHASE, tenantId, documentType: 'PURCHASE_INVOICE', prefix: 'PUR', padding: 5 },
            { id: SEED_IDS.DOC_SEQ_SALES,    tenantId, documentType: 'SALES_INVOICE',    prefix: 'SAL', padding: 5 },
            { id: SEED_IDS.DOC_SEQ_PAYMENT,  tenantId, documentType: 'PAYMENT',          prefix: 'PAY', padding: 5 },
            { id: SEED_IDS.DOC_SEQ_RECEIPT,  tenantId, documentType: 'RECEIPT',          prefix: 'REC', padding: 5 },
            { id: SEED_IDS.DOC_SEQ_EXPENSE,  tenantId, documentType: 'EXPENSE',          prefix: 'EXP', padding: 5 },
            { id: SEED_IDS.DOC_SEQ_STOCK,    tenantId, documentType: 'STOCK_COUNT',      prefix: 'SCT', padding: 5 },
            // Opening balance entry (seedJournalEntry) reserves JE-00001, so the sequence starts at 2.
            { id: SEED_IDS.DOC_SEQ_JOURNAL,  tenantId, documentType: 'JOURNAL_ENTRY',    prefix: 'JE',  padding: 5, nextNumber: 2 },
        ],
    })
}
