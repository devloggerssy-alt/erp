import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { BankAccount, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class BankAccountsRepository extends CrudRepository<BankAccount, Prisma.BankAccountDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.bankAccount);
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.bankAccount.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }

    /** journal_lines.bank_account_id is ON DELETE SET NULL: deleting the bank account would silently detach them. */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        return this.prisma.journalLine.count({ where: { tenantId, bankAccountId: id } });
    }
}
