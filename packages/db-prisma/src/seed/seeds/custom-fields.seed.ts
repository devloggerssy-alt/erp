import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedCustomFields(prisma: PrismaClient, tenantId: string): Promise<void> {
    const colorField = await prisma.customField.create({
        data: {
            id: SEED_IDS.CUSTOM_FIELD_COLOR,
            tenantId,
            module: 'items',
            name: { ar: 'color', en: 'color' },
            label: { ar: 'اللون', en: 'Color' },
            type: 'SELECT',
            options: ['Red', 'Blue', 'Black', 'White'],
            isRequired: false,
            showInList: true,
        },
    })

    const warrantyField = await prisma.customField.create({
        data: {
            id: SEED_IDS.CUSTOM_FIELD_WARRANTY,
            tenantId,
            module: 'items',
            name: { ar: 'warranty_months', en: 'warranty_months' },
            label: { ar: 'مدة الضمان (شهر)', en: 'Warranty (months)' },
            type: 'NUMBER',
            isRequired: false,
            showInList: true,
        },
    })

    await prisma.customFieldValue.createMany({
        data: [
            {
                tenantId,
                fieldId: colorField.id,
                entityType: 'items',
                entityId: SEED_IDS.ITEM_LAPTOP,
                value: 'Black',
            },
            {
                tenantId,
                fieldId: warrantyField.id,
                entityType: 'items',
                entityId: SEED_IDS.ITEM_LAPTOP,
                value: '12',
            },
        ],
    })
}
