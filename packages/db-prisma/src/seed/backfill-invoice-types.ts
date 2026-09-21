import 'dotenv/config'
import { PrismaClient } from '../../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Standard invoice types every tenant needs to create invoices. Mirrors
 * `seeds/invoice-types.seed.ts` (demo seed) and
 * `apps/api/src/modules/invoicing/invoice-types/default-invoice-types.ts`
 * (onboarding bootstrap) — keep all three in sync.
 */
const INVOICE_TYPE_DEFAULTS = [
    { code: 'PINV', name: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' }, direction: 'PURCHASE', affectsStock: true },
    { code: 'SINV', name: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' }, direction: 'SALE', affectsStock: true },
    { code: 'PRET', name: { ar: 'مرتجع مشتريات', en: 'Purchase Return' }, direction: 'SALE', affectsStock: true },
    { code: 'SRET', name: { ar: 'مرتجع مبيعات', en: 'Sales Return' }, direction: 'PURCHASE', affectsStock: true },
    { code: 'CONS', name: { ar: 'استهلاك داخلي', en: 'Internal Consumption' }, direction: 'SALE', affectsStock: true },
] as const

export interface InvoiceTypeBackfillOptions {
    dryRun?: boolean
}

export interface InvoiceTypeBackfillResult {
    created: number
    tenants: number
}

/**
 * Idempotently creates the standard invoice types for every tenant that has
 * none. Tenants with at least one invoice type are left untouched.
 */
export async function backfillInvoiceTypes(
    prisma: PrismaClient,
    options: InvoiceTypeBackfillOptions = {},
): Promise<InvoiceTypeBackfillResult> {
    const tenants = await prisma.tenant.findMany({ select: { id: true } })
    let created = 0

    for (const tenant of tenants) {
        const existing = await prisma.invoiceType.count({ where: { tenantId: tenant.id } })
        if (existing > 0) continue

        for (const def of INVOICE_TYPE_DEFAULTS) {
            created += 1
            if (!options.dryRun) {
                await prisma.invoiceType.create({
                    data: {
                        tenantId: tenant.id,
                        code: def.code,
                        name: def.name,
                        direction: def.direction,
                        affectsStock: def.affectsStock,
                    },
                })
            }
            console.log(`  ${options.dryRun ? 'would create' : 'created'} ${def.code} for tenant ${tenant.id}`)
        }
    }

    return { created, tenants: tenants.length }
}

async function main() {
    const dryRun = process.argv.includes('--dry-run')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
        const result = await backfillInvoiceTypes(prisma, { dryRun })
        const prefix = dryRun ? 'Would create' : 'Created'
        console.log(`${prefix} ${result.created} invoice type(s) across ${result.tenants} tenant(s).`)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

if (require.main === module) {
    main()
}

export const backfill = main
