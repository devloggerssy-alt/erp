import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { BankAccount } from '@devloggers/db-prisma';

@Injectable()
export class BankAccountsRepository extends CrudRepository<BankAccount> {
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
}
