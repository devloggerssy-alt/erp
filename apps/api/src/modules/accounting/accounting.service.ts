import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class AccountingService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllAccounts(tenantId: string) {
        return this.prisma.chartOfAccount.findMany({
            where: { tenantId },
            include: { parent: { select: { code: true, name: true } } },
            orderBy: { code: 'asc' },
        });
    }

    async findAccountById(tenantId: string, id: string) {
        const account = await this.prisma.chartOfAccount.findFirst({
            where: { id, tenantId },
            include: { parent: true, children: true },
        });
        if (!account) throw new NotFoundException('Account not found');
        return account;
    }

    async createAccount(tenantId: string, dto: { code: string; name: string; type: string; parentId?: string }) {
        const existing = await this.prisma.chartOfAccount.findFirst({ where: { tenantId, code: dto.code } });
        if (existing) throw new ConflictException('Account with this code already exists');
        if (dto.parentId) await this.findAccountById(tenantId, dto.parentId);
        return this.prisma.chartOfAccount.create({ data: { tenantId, ...dto } as any });
    }

    async updateAccount(tenantId: string, id: string, dto: { name?: string; parentId?: string | null; isActive?: boolean }) {
        await this.findAccountById(tenantId, id);
        return this.prisma.chartOfAccount.update({ where: { id }, data: dto as any });
    }

    async findJournalEntries(tenantId: string, page = 1, limit = 50) {
        const [data, total] = await Promise.all([
            this.prisma.journalEntry.findMany({
                where: { tenantId },
                include: { lines: { include: { account: { select: { code: true, name: true } } } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.journalEntry.count({ where: { tenantId } }),
        ]);
        return { data, total, page, limit };
    }

    async findJournalEntryById(tenantId: string, id: string) {
        const entry = await this.prisma.journalEntry.findFirst({
            where: { id, tenantId },
            include: { lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!entry) throw new NotFoundException('Journal entry not found');
        return entry;
    }
}
