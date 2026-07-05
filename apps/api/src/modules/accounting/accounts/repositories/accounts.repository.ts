import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, FindManyOptions } from '@devloggers/backend-core';
import { JournalEntryStatus, type ChartOfAccount } from '@devloggers/db-prisma';

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
        });
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

    /** All accounts (minimal columns) for the balances read-model. */
    async findAllForBalances(tenantId: string) {
        return this.prisma.chartOfAccount.findMany({
            where: { tenantId },
            select: { id: true, code: true, name: true, type: true, parentId: true, isActive: true },
            orderBy: { code: 'asc' },
        });
    }

    /** Lightweight account list for tree navigation (no balance computation). */
    async findAllForTree(tenantId: string) {
        return this.prisma.chartOfAccount.findMany({
            where: { tenantId },
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                parentId: true,
                isActive: true,
            },
            orderBy: { code: 'asc' },
        });
    }

    /** Sum of POSTED debit/credit grouped by account, tenant-scoped. */
    async sumPostedLinesByAccount(
        tenantId: string,
    ): Promise<Array<{ accountId: string; debit: number; credit: number }>> {
        const grouped = await this.prisma.journalLine.groupBy({
            by: ['accountId'],
            where: { tenantId, journalEntry: { status: JournalEntryStatus.POSTED } },
            _sum: { debit: true, credit: true },
        });
        return grouped.map((g) => ({
            accountId: g.accountId,
            debit: Number(g._sum.debit ?? 0),
            credit: Number(g._sum.credit ?? 0),
        }));
    }

    /** One page of POSTED journal lines hitting a single account, newest entry first. */
    async findLedgerLines(tenantId: string, accountId: string, skip: number, take: number) {
        return this.prisma.journalLine.findMany({
            where: { tenantId, accountId, journalEntry: { status: JournalEntryStatus.POSTED } },
            select: {
                id: true,
                debit: true,
                credit: true,
                description: true,
                journalEntry: { select: { number: true, date: true, referenceType: true, referenceId: true } },
            },
            orderBy: [{ journalEntry: { date: 'desc' } }, { sortOrder: 'asc' }],
            skip,
            take,
        });
    }

    async countLedgerLines(tenantId: string, accountId: string): Promise<number> {
        return this.prisma.journalLine.count({
            where: { tenantId, accountId, journalEntry: { status: JournalEntryStatus.POSTED } },
        });
    }
}
