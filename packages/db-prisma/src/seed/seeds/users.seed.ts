import * as bcrypt from 'bcryptjs'
import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedUsers(prisma: PrismaClient, tenantId: string): Promise<void> {
    const [adminHash, userHash] = await Promise.all([
        bcrypt.hash('admin123', 10),
        bcrypt.hash('user123', 10),
    ])

    await Promise.all([
        prisma.appUser.create({
            data: {
                id: SEED_IDS.USER_ADMIN,
                tenantId,
                email: 'admin@demo-shop.com',
                passwordHash: adminHash,
                fullName: 'Admin User',
                userRoles: { create: { roleId: SEED_IDS.ROLE_ADMIN } },
            },
        }),
        prisma.appUser.create({
            data: {
                id: SEED_IDS.USER_ACCOUNTANT,
                tenantId,
                email: 'accountant@demo-shop.com',
                passwordHash: userHash,
                fullName: 'Sara Al-Amin',
                userRoles: { create: { roleId: SEED_IDS.ROLE_ACCOUNTANT } },
            },
        }),
        prisma.appUser.create({
            data: {
                id: SEED_IDS.USER_WAREHOUSE,
                tenantId,
                email: 'warehouse@demo-shop.com',
                passwordHash: userHash,
                fullName: 'Khalid Barakat',
                userRoles: { create: { roleId: SEED_IDS.ROLE_WAREHOUSE } },
            },
        }),
        prisma.appUser.create({
            data: {
                id: SEED_IDS.USER_SALES,
                tenantId,
                email: 'sales@demo-shop.com',
                passwordHash: userHash,
                fullName: 'Lina Nasser',
                userRoles: { create: { roleId: SEED_IDS.ROLE_SALES } },
            },
        }),
    ])
}
