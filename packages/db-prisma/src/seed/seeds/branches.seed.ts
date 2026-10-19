import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

/**
 * Seeds the tenant's default `MAIN` branch and links the seeded warehouses to
 * it, mirroring the Phase 1.1 backfill (migration `20261019120000_add_branches`)
 * so seeded data satisfies the API's "a warehouse has at least one branch" rule.
 */
export async function seedBranches(prisma: PrismaClient, tenantId: string): Promise<void> {
    await prisma.branch.create({
        data: {
            id: SEED_IDS.BRANCH_MAIN,
            tenantId,
            code: 'MAIN',
            name: { ar: 'الفرع الرئيسي', en: 'Main Branch' },
            address: 'Damascus, Syria',
        },
    })

    await prisma.branchWarehouse.createMany({
        data: [
            { tenantId, branchId: SEED_IDS.BRANCH_MAIN, warehouseId: SEED_IDS.WAREHOUSE_MAIN },
            { tenantId, branchId: SEED_IDS.BRANCH_MAIN, warehouseId: SEED_IDS.WAREHOUSE_SHOWROOM },
        ],
    })

    await prisma.cashbox.updateMany({
        where: { tenantId, branchId: null },
        data: { branchId: SEED_IDS.BRANCH_MAIN },
    })

    await prisma.documentSequence.updateMany({
        where: { tenantId, branchId: null },
        data: { branchId: SEED_IDS.BRANCH_MAIN },
    })
}
