import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { CustomField } from '@devloggers/db-prisma';

@Injectable()
export class CustomFieldsRepository extends CrudRepository<CustomField> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.customField);
    }

    async findByModule(tenantId: string, module: string): Promise<CustomField[]> {
        return this.prisma.customField.findMany({
            where: { tenantId, module },
            orderBy: { createdAt: 'asc' },
        });
    }

    async isNameTaken(
        tenantId: string,
        module: string,
        nameAr: string,
        excludeId?: string,
    ): Promise<boolean> {
        const count = await this.prisma.customField.count({
            where: {
                tenantId,
                module,
                name: { path: ['ar'], equals: nameAr },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
}
