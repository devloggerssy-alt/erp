import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedTenant(prisma: PrismaClient): Promise<string> {
    const tenant = await prisma.tenant.create({
        data: {
            id: SEED_IDS.TENANT,
            name: 'Demo Shop',
            slug: 'demo-shop',
            email: 'admin@demo-shop.com',
            phone: '+963-11-1234567',
            address: 'Damascus, Syria',
        },
    })
    return tenant.id
}
