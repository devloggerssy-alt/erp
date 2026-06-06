import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedItemCategories(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_ELECTRONICS, tenantId, name: 'Electronics',      description: 'Electronic devices and accessories' } }),
        prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_CLOTHING,    tenantId, name: 'Clothing',         description: 'Apparel and textiles' } }),
        prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_FOOD,        tenantId, name: 'Food & Beverages', description: 'Food products and drinks' } }),
        prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_HOME,        tenantId, name: 'Home & Garden',    description: 'Household and garden items' } }),
        prisma.itemCategory.create({ data: { id: SEED_IDS.CAT_OFFICE,      tenantId, name: 'Office Supplies',  description: 'Stationery and office materials' } }),
    ])
}
