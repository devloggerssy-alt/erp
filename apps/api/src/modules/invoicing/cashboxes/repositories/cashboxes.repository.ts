import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Cashbox, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class CashboxesRepository extends CrudRepository<Cashbox, Prisma.CashboxDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.cashbox);
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.cashbox.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }

    /** journal_lines.cashbox_id is ON DELETE SET NULL: deleting the cashbox would silently detach them. */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        return this.prisma.journalLine.count({ where: { tenantId, cashboxId: id } });
    }
}
