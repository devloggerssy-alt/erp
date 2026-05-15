import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, FindManyOptions } from '@devloggers/backend-core';
import type { ChartOfAccount } from '@devloggers/db-prisma';

@Injectable()
export class AccountsRepository extends CrudRepository<ChartOfAccount> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.chartOfAccount);
    }

    /** List always sorted by code and includes parent name/code for display. */
    override async findMany(tenantId: string, options: FindManyOptions = {}) {
        return super.findMany(tenantId, {
            ...options,
            orderBy: options.orderBy ?? { code: 'asc' },
            include: { parent: { select: { code: true, name: true } } },
        });
    }

    /** Detail view includes parent and direct children. */
    override async findById(tenantId: string, id: string): Promise<ChartOfAccount | null> {
        return this.prisma.chartOfAccount.findFirst({
            where: { id, tenantId },
            include: {
                parent: { select: { id: true, code: true, name: true } },
                children: { select: { id: true, code: true, name: true, type: true, isActive: true }, orderBy: { code: 'asc' } },
            },
        }) as any;
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.chartOfAccount.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
}
