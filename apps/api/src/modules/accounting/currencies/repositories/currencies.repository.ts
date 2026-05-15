import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Currency } from '@devloggers/db-prisma';

@Injectable()
export class CurrenciesRepository extends CrudRepository<Currency> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.currency);
    }

    async isCodeTaken(tenantId: string, code: string): Promise<boolean> {
        const count = await this.prisma.currency.count({ where: { tenantId, code } });
        return count > 0;
    }

    async findBase(tenantId: string): Promise<Currency | null> {
        return this.prisma.currency.findFirst({ where: { tenantId, isBase: true } });
    }

    async clearBase(tenantId: string): Promise<void> {
        await this.prisma.currency.updateMany({ where: { tenantId, isBase: true }, data: { isBase: false } });
    }
}
