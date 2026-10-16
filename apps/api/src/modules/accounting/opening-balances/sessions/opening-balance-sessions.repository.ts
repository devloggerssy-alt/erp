import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { OpeningBalanceSession, Prisma } from '@devloggers/db-prisma';

const SESSION_WITH_LINES_INCLUDE = {
    lines: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OpeningBalanceSessionInclude;

export type OpeningBalanceSessionWithLines = Prisma.OpeningBalanceSessionGetPayload<{
    include: typeof SESSION_WITH_LINES_INCLUDE;
}>;

@Injectable()
export class OpeningBalanceSessionsRepository extends CrudRepository<OpeningBalanceSession, Prisma.OpeningBalanceSessionDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.openingBalanceSession);
    }

    findWithLines(tenantId: string, id: string): Promise<OpeningBalanceSessionWithLines | null> {
        return this.prisma.openingBalanceSession.findFirst({
            where: { id, tenantId },
            include: SESSION_WITH_LINES_INCLUDE,
        });
    }
}