import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { OpeningBalanceSession, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class OpeningBalanceSessionsRepository extends CrudRepository<OpeningBalanceSession, Prisma.OpeningBalanceSessionDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.openingBalanceSession);
    }

    findWithLines(tenantId: string, id: string) {
        return this.prisma.openingBalanceSession.findFirst({
            where: { id, tenantId },
            include: { lines: { orderBy: { createdAt: 'asc' } } },
        });
    }
}