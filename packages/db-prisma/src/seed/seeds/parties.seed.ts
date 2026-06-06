import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedParties(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.party.create({ data: { id: SEED_IDS.PARTY_AHMAD,    tenantId, code: 'CUST-001', name: 'Ahmad Al-Hassan',        type: 'CUSTOMER',          phone: '+963-933-111222', email: 'ahmad@example.com',       address: 'Damascus, Mazzeh' } }),
        prisma.party.create({ data: { id: SEED_IDS.PARTY_NOUR,     tenantId, code: 'CUST-002', name: 'Nour Trading Co.',       type: 'CUSTOMER',          phone: '+963-944-333444', email: 'nour@trading.sy',          address: 'Aleppo, Al-Azizieh' } }),
        prisma.party.create({ data: { id: SEED_IDS.PARTY_RIMA,     tenantId, code: 'CUST-003', name: 'Rima Habash',            type: 'CUSTOMER_SUPPLIER', phone: '+963-955-555666', email: 'rima@example.com',         address: 'Latakia, Corniche' } }),
        prisma.party.create({ data: { id: SEED_IDS.PARTY_DAMASCUS, tenantId, code: 'SUPP-001', name: 'Damascus Import Co.',    type: 'SUPPLIER',          phone: '+963-11-9876543', email: 'info@damsimport.sy',       address: 'Damascus, Industrial Zone' } }),
        prisma.party.create({ data: { id: SEED_IDS.PARTY_HALABI,   tenantId, code: 'SUPP-002', name: 'Halabi Wholesale Ltd.',   type: 'SUPPLIER',          phone: '+963-21-8765432', email: 'sales@halabiwholesale.sy', address: 'Aleppo, Trade Quarter' } }),
    ])
}
