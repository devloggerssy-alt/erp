import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedItems(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.item.create({ data: { id: SEED_IDS.ITEM_LAPTOP,     tenantId, code: 'ELEC-001', name: 'Laptop 15"',         categoryId: SEED_IDS.CAT_ELECTRONICS, baseUnitId: SEED_IDS.UNIT_PIECE, defaultSellingPrice: 750000,  latestPurchasePrice: 600000 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_SMARTPHONE, tenantId, code: 'ELEC-002', name: 'Smartphone',          categoryId: SEED_IDS.CAT_ELECTRONICS, baseUnitId: SEED_IDS.UNIT_PIECE, defaultSellingPrice: 350000,  latestPurchasePrice: 280000 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_TSHIRT,     tenantId, code: 'CLTH-001', name: "Men's T-Shirt",       categoryId: SEED_IDS.CAT_CLOTHING,    baseUnitId: SEED_IDS.UNIT_PIECE, defaultSellingPrice: 8000,    latestPurchasePrice: 5000 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_FABRIC,     tenantId, code: 'CLTH-002', name: 'Fabric (Cotton)',     categoryId: SEED_IDS.CAT_CLOTHING,    baseUnitId: SEED_IDS.UNIT_METER, defaultSellingPrice: 4000,    latestPurchasePrice: 2500 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_RICE,       tenantId, code: 'FOOD-001', name: 'Rice (Local)',        categoryId: SEED_IDS.CAT_FOOD,        baseUnitId: SEED_IDS.UNIT_KG,    defaultSellingPrice: 3500,    latestPurchasePrice: 2800 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_OIL,        tenantId, code: 'FOOD-002', name: 'Cooking Oil 1L',      categoryId: SEED_IDS.CAT_FOOD,        baseUnitId: SEED_IDS.UNIT_LITER, defaultSellingPrice: 12000,   latestPurchasePrice: 9500 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_WATER,      tenantId, code: 'FOOD-003', name: 'Bottled Water 1.5L', categoryId: SEED_IDS.CAT_FOOD,        baseUnitId: SEED_IDS.UNIT_PIECE, defaultSellingPrice: 500,     latestPurchasePrice: 350 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_DETERGENT,  tenantId, code: 'HOME-001', name: 'Cleaning Detergent', categoryId: SEED_IDS.CAT_HOME,        baseUnitId: SEED_IDS.UNIT_BOX,   defaultSellingPrice: 6000,    latestPurchasePrice: 4500 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_PAPER,      tenantId, code: 'OFFC-001', name: 'A4 Copy Paper',       categoryId: SEED_IDS.CAT_OFFICE,      baseUnitId: SEED_IDS.UNIT_BOX,   defaultSellingPrice: 22000,   latestPurchasePrice: 18000 } }),
        prisma.item.create({ data: { id: SEED_IDS.ITEM_PEN,        tenantId, code: 'OFFC-002', name: 'Ballpoint Pen',       categoryId: SEED_IDS.CAT_OFFICE,      baseUnitId: SEED_IDS.UNIT_PIECE, defaultSellingPrice: 500,     latestPurchasePrice: 250 } }),
    ])
}
