import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

// Keep names in sync with DEFAULT_ROLE_DEFINITIONS in @devloggers/api-contracts
// (db-prisma cannot depend on api-contracts — that would be a circular package dep).
export async function seedRoles(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.role.create({
            data: {
                id: SEED_IDS.ROLE_OWNER,
                tenantId,
                name: { ar: 'المالك', en: 'Owner' },
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
                id: SEED_IDS.ROLE_INVENTORY,
                tenantId,
                name: { ar: 'مسؤول المخزون', en: 'Inventory' },
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
        prisma.role.create({
            data: {
                id: SEED_IDS.ROLE_VIEWER,
                tenantId,
                name: { ar: 'مُطّلع', en: 'Viewer' },
                description: { ar: 'اطلاع فقط دون تعديل', en: 'Read-only access' },
                isSystem: true,
            },
        }),
    ])
}
