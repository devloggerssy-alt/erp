import 'dotenv/config'
import { PrismaClient } from '../../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Canonical document types requested by the backend through
 * `DocumentSequencesService.getNextNumber(...)`:
 *   PURCHASE_INVOICE / SALES_INVOICE  → invoices.service
 *   PAYMENT / PAYMENT_ADJUSTMENT      → payments.service
 *   RECEIPT                           → payments.service
 *   EXPENSE                           → expenses.service
 *   STOCK_COUNT                       → stock-counts.service
 *   JOURNAL_ENTRY                     → accounting-posting.facade
 *   OPENING_BALANCE                   → opening-balance-sessions.service
 *
 * Keep in sync with `seeds/document-sequences.seed.ts` and
 * apps/dashboard/modules/onboarding/onboarding.config.ts (DEFAULT_SEQUENCES).
 */
const DOCUMENT_SEQUENCE_DEFAULTS = [
    { documentType: 'PURCHASE_INVOICE',   prefix: 'PUR', padding: 5 },
    { documentType: 'SALES_INVOICE',      prefix: 'SAL', padding: 5 },
    { documentType: 'PAYMENT',            prefix: 'PAY', padding: 5 },
    { documentType: 'PAYMENT_ADJUSTMENT', prefix: 'ADJ', padding: 5 },
    { documentType: 'RECEIPT',            prefix: 'REC', padding: 5 },
    { documentType: 'EXPENSE',            prefix: 'EXP', padding: 5 },
    { documentType: 'STOCK_COUNT',        prefix: 'SCT', padding: 5 },
    { documentType: 'JOURNAL_ENTRY',      prefix: 'JE',  padding: 5 },
    { documentType: 'OPENING_BALANCE',    prefix: 'OB',  padding: 5 },
] as const

/** Names the onboarding wizard used before they were aligned with the backend. */
const LEGACY_BY_CANONICAL: Record<string, string> = {
    STOCK_COUNT: 'STOCK_ADJUSTMENT',
    JOURNAL_ENTRY: 'JOURNAL',
}

export interface DocumentSequenceBackfillOptions {
    dryRun?: boolean
}

export interface DocumentSequenceBackfillResult {
    created: number
    renamed: number
    tenants: number
}

export async function backfillDocumentSequences(
    prisma: PrismaClient,
    options: DocumentSequenceBackfillOptions = {},
): Promise<DocumentSequenceBackfillResult> {
    const tenants = await prisma.tenant.findMany({ select: { id: true } })
    let created = 0
    let renamed = 0

    for (const tenant of tenants) {
        for (const def of DOCUMENT_SEQUENCE_DEFAULTS) {
            const existing = await prisma.documentSequence.findUnique({
                where: { tenantId_documentType: { tenantId: tenant.id, documentType: def.documentType } },
                select: { id: true },
            })
            if (existing) continue

            const legacyType = LEGACY_BY_CANONICAL[def.documentType]
            const legacy = legacyType
                ? await prisma.documentSequence.findUnique({
                    where: { tenantId_documentType: { tenantId: tenant.id, documentType: legacyType } },
                    select: { id: true },
                })
                : null

            if (legacy) {
                renamed += 1
                if (!options.dryRun) {
                    await prisma.documentSequence.update({
                        where: { id: legacy.id },
                        data: { documentType: def.documentType },
                    })
                }
                console.log(`  ${options.dryRun ? 'would rename' : 'renamed'} ${legacyType} → ${def.documentType} for tenant ${tenant.id}`)
            } else {
                created += 1
                if (!options.dryRun) {
                    await prisma.documentSequence.create({
                        data: {
                            tenantId: tenant.id,
                            documentType: def.documentType,
                            prefix: def.prefix,
                            padding: def.padding,
                        },
                    })
                }
                console.log(`  ${options.dryRun ? 'would create' : 'created'} ${def.documentType} for tenant ${tenant.id}`)
            }
        }
    }

    return { created, renamed, tenants: tenants.length }
}

async function main() {
    const dryRun = process.argv.includes('--dry-run')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
        const result = await backfillDocumentSequences(prisma, { dryRun })
        const prefix = dryRun ? 'Would create' : 'Created'
        const renamePrefix = dryRun ? 'would rename' : 'renamed'
        console.log(`${prefix} ${result.created} sequence(s), ${renamePrefix} ${result.renamed} legacy sequence(s) across ${result.tenants} tenant(s).`)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

if (require.main === module) {
    main()
}

export const backfill = main
