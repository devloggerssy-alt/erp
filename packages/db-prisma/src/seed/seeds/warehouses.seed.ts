import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

const n = (ar: string, en: string) => ({ ar, en })

export async function seedWarehouses(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.warehouse.create({ data: { id: SEED_IDS.WAREHOUSE_MAIN,     tenantId, code: 'WH-MAIN', name: n('المستودع الرئيسي', 'Main Warehouse'), address: 'Damascus Industrial Zone' } }),
        prisma.warehouse.create({ data: { id: SEED_IDS.WAREHOUSE_SHOWROOM, tenantId, code: 'WH-SHOW', name: n('صالة العرض', 'Showroom'),       address: 'Damascus City Center' } }),
    ])
}
