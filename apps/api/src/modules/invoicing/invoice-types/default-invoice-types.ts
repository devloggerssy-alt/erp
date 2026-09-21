import type { Prisma } from '@devloggers/db-prisma';

/**
 * Standard invoice types bootstrapped for every new tenant during
 * onboarding. Mirrors `packages/db-prisma/src/seed/seeds/invoice-types.seed.ts`
 * (demo-seed definitions) — keep both in sync.
 */
export type DefaultInvoiceType = Omit<Prisma.InvoiceTypeCreateManyInput, 'tenantId'>;

export const DEFAULT_INVOICE_TYPES: DefaultInvoiceType[] = [
    {
        code: 'PINV',
        name: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
        direction: 'PURCHASE',
        affectsStock: true,
    },
    {
        code: 'SINV',
        name: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },
        direction: 'SALE',
        affectsStock: true,
    },
    {
        code: 'PRET',
        name: { ar: 'مرتجع مشتريات', en: 'Purchase Return' },
        direction: 'SALE',
        affectsStock: true,
    },
    {
        code: 'SRET',
        name: { ar: 'مرتجع مبيعات', en: 'Sales Return' },
        direction: 'PURCHASE',
        affectsStock: true,
    },
    {
        code: 'CONS',
        name: { ar: 'استهلاك داخلي', en: 'Internal Consumption' },
        direction: 'SALE',
        affectsStock: true,
    },
];
