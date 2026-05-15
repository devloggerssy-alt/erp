import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { InvoiceType } from '@devloggers/db-prisma';

@Injectable()
export class InvoiceTypesRepository extends CrudRepository<InvoiceType> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.invoiceType);
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.invoiceType.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
}
