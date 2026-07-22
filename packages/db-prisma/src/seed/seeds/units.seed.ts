import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

const n = (ar: string, en: string) => ({ ar, en })

export async function seedUnits(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_PIECE,  tenantId, name: n('قطعة', 'Piece'),    abbreviation: 'pcs' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_KG,     tenantId, name: n('كيلوغرام', 'Kilogram'), abbreviation: 'kg' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_LITER,  tenantId, name: n('لتر', 'Liter'),    abbreviation: 'L' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_METER,  tenantId, name: n('متر', 'Meter'),    abbreviation: 'm' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_BOX,    tenantId, name: n('علبة', 'Box'),      abbreviation: 'box' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_DOZEN,  tenantId, name: n('دزينة', 'Dozen'),    abbreviation: 'doz' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_PACK,   tenantId, name: n('حزمة', 'Pack'),     abbreviation: 'pack' } }),
    ])
}
