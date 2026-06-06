import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedInvoiceTypes(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.invoiceType.create({
            data: {
                id: SEED_IDS.INV_TYPE_PURCHASE,
                tenantId,
                code: 'PINV',
                name: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
                direction: 'PURCHASE',
                affectsStock: true,
            },
        }),
        prisma.invoiceType.create({
            data: {
                id: SEED_IDS.INV_TYPE_SALES,
                tenantId,
                code: 'SINV',
                name: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
                direction: 'SALE',
                affectsStock: true,
            },
        }),
        prisma.invoiceType.create({
            data: {
                id: SEED_IDS.INV_TYPE_PURCHASE_RET,
                tenantId,
                code: 'PRET',
                name: { ar: 'مرتجع مشتريات', en: 'Purchase Return' },
                direction: 'SALE',
                affectsStock: true,
            },
        }),
        prisma.invoiceType.create({
            data: {
                id: SEED_IDS.INV_TYPE_SALES_RET,
                tenantId,
                code: 'SRET',
                name: { ar: 'مرتجع مبيعات', en: 'Sales Return' },
                direction: 'PURCHASE',
                affectsStock: true,
            },
        }),
        prisma.invoiceType.create({
            data: {
                id: SEED_IDS.INV_TYPE_CONSUMPTION,
                tenantId,
                code: 'CONS',
                name: { ar: 'استهلاك داخلي', en: 'Internal Consumption' },
                direction: 'SALE',
                affectsStock: true,
            },
        }),
    ])
}
