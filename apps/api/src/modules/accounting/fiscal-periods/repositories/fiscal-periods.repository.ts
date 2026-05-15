import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { FiscalPeriod } from '@devloggers/db-prisma';

@Injectable()
export class FiscalPeriodsRepository extends CrudRepository<FiscalPeriod> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.fiscalPeriod);
    }

    async findOverlapping(tenantId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<FiscalPeriod | null> {
        return this.prisma.fiscalPeriod.findFirst({
            where: {
                tenantId,
                ...(excludeId ? { id: { not: excludeId } } : {}),
                OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
            },
        });
    }
}
