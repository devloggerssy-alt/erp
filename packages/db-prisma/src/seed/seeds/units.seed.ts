import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedUnits(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_PIECE,  tenantId, name: 'Piece',    abbreviation: 'pcs' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_KG,     tenantId, name: 'Kilogram', abbreviation: 'kg' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_LITER,  tenantId, name: 'Liter',    abbreviation: 'L' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_METER,  tenantId, name: 'Meter',    abbreviation: 'm' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_BOX,    tenantId, name: 'Box',      abbreviation: 'box' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_DOZEN,  tenantId, name: 'Dozen',    abbreviation: 'doz' } }),
        prisma.unit.create({ data: { id: SEED_IDS.UNIT_PACK,   tenantId, name: 'Pack',     abbreviation: 'pack' } }),
    ])
}
