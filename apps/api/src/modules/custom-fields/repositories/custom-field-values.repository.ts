import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { CustomField, CustomFieldValue } from '@devloggers/db-prisma';

@Injectable()
export class CustomFieldValuesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findForEntity(
        tenantId: string,
        entityType: string,
        entityId: string,
    ): Promise<Array<CustomFieldValue & { field: CustomField }>> {
        return this.prisma.customFieldValue.findMany({
            where: { tenantId, entityType, entityId },
            include: { field: true },
        }) as Promise<Array<CustomFieldValue & { field: CustomField }>>;
    }

    async findForEntities(
        tenantId: string,
        entityType: string,
        entityIds: string[],
    ): Promise<Array<CustomFieldValue & { field: CustomField }>> {
        if (entityIds.length === 0) return [];

        return this.prisma.customFieldValue.findMany({
            where: {
                tenantId,
                entityType,
                entityId: { in: entityIds },
            },
            include: { field: true },
        }) as Promise<Array<CustomFieldValue & { field: CustomField }>>;
    }

    async deleteForEntity(tenantId: string, entityType: string, entityId: string): Promise<void> {
        await this.prisma.customFieldValue.deleteMany({
            where: { tenantId, entityType, entityId },
        });
    }

    async upsertMany(
        tenantId: string,
        entityType: string,
        entityId: string,
        rows: Array<{ fieldId: string; value: string }>,
    ): Promise<void> {
        await this.prisma.$transaction(
            rows.map((row) =>
                this.prisma.customFieldValue.upsert({
                    where: {
                        tenantId_fieldId_entityId: {
                            tenantId,
                            fieldId: row.fieldId,
                            entityId,
                        },
                    },
                    create: {
                        tenantId,
                        fieldId: row.fieldId,
                        entityType,
                        entityId,
                        value: row.value,
                    },
                    update: { value: row.value },
                }),
            ),
        );
    }
}
