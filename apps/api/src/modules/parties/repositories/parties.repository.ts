import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Party, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class PartiesRepository extends CrudRepository<Party, Prisma.PartyDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.party);
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.party.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }

    /**
     * Posted rows whose party FK is ON DELETE SET NULL (payments.party_id,
     * journal_lines.party_id): deleting the party would silently detach them.
     */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        const [payments, journalLines] = await Promise.all([
            this.prisma.payment.count({ where: { tenantId, partyId: id } }),
            this.prisma.journalLine.count({ where: { tenantId, partyId: id } }),
        ]);
        return payments + journalLines;
    }
}
