import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class JournalEntriesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findMany(tenantId: string, page: number, limit: number) {
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
        return { data, total };
    }

    async findById(tenantId: string, id: string) {
        return this.prisma.journalEntry.findFirst({
            where: { id, tenantId },
            include: { lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } } },
        });
    }
}
