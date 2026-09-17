import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma, ReconciliationRun } from '@devloggers/db-prisma';

@Injectable()
export class ReconciliationRunsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findLatest(tenantId: string): Promise<ReconciliationRun | null> {
        return this.prisma.reconciliationRun.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    }

    create(data: Prisma.ReconciliationRunUncheckedCreateInput): Promise<ReconciliationRun> {
        return this.prisma.reconciliationRun.create({ data });
    }

    listRecent(tenantId: string, take: number): Promise<ReconciliationRun[]> {
        return this.prisma.reconciliationRun.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take });
    }

    /** Scheduler fan-out. Cross-tenant by design — never exposed over HTTP. */
    async listTenantIds(): Promise<string[]> {
        const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
        return tenants.map((t) => t.id);
    }
}
