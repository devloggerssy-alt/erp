import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

const VALUE_WITH_FIELD_INCLUDE = { field: true } satisfies Prisma.CustomFieldValueInclude;

export type CustomFieldValueWithField = Prisma.CustomFieldValueGetPayload<{
    include: typeof VALUE_WITH_FIELD_INCLUDE;
}>;

@Injectable()
export class CustomFieldValuesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findForEntity(
        tenantId: string,
        entityType: string,
        entityId: string,
    ): Promise<CustomFieldValueWithField[]> {
        return this.prisma.customFieldValue.findMany({
            where: { tenantId, entityType, entityId },
            include: VALUE_WITH_FIELD_INCLUDE,
        });
    }

    async findForEntities(
        tenantId: string,
        entityType: string,
        entityIds: string[],
    ): Promise<CustomFieldValueWithField[]> {
        if (entityIds.length === 0) return [];

        return this.prisma.customFieldValue.findMany({
            where: {
                tenantId,
                entityType,
                entityId: { in: entityIds },
            },
            include: VALUE_WITH_FIELD_INCLUDE,
        });
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
