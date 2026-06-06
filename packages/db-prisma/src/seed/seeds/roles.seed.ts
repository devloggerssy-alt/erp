import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedRoles(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.role.create({
            data: {
                id: SEED_IDS.ROLE_ADMIN,
                tenantId,
                name: { ar: 'مدير النظام', en: 'Admin' },
                description: { ar: 'صلاحية كاملة على النظام', en: 'Full system access' },
                isSystem: true,
            },
        }),
        prisma.role.create({
            data: {
                id: SEED_IDS.ROLE_ACCOUNTANT,
                tenantId,
                name: { ar: 'محاسب', en: 'Accountant' },
                description: { ar: 'صلاحية المحاسبة والمالية', en: 'Accounting and finance access' },
                isSystem: true,
            },
        }),
        prisma.role.create({
            data: {
                id: SEED_IDS.ROLE_WAREHOUSE,
                tenantId,
                name: { ar: 'أمين المستودع', en: 'Warehouse' },
                description: { ar: 'صلاحية المخزون والمستودعات', en: 'Inventory and warehouse access' },
                isSystem: true,
            },
        }),
        prisma.role.create({
            data: {
                id: SEED_IDS.ROLE_SALES,
                tenantId,
                name: { ar: 'موظف مبيعات', en: 'Sales' },
                description: { ar: 'إدارة المبيعات والعملاء', en: 'Sales and customer management' },
                isSystem: true,
            },
        }),
    ])
}
