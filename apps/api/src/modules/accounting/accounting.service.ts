import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class AccountingService {
    constructor(private readonly prisma: PrismaService) {}

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
