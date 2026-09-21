import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

export interface TenantSetupState {
    businessSetupCompletedAt: Date | null;
    operationalReadiness: Prisma.JsonValue | null;
}

@Injectable()
export class BusinessSetupTenantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findSetupState(tenantId: string): Promise<TenantSetupState | null> {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { businessSetupCompletedAt: true, operationalReadiness: true },
        });
    }

    async setCompletedAt(tenantId: string, completedAt: Date): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { businessSetupCompletedAt: completedAt },
        });
    }

    async setOperationalReadiness(tenantId: string, readiness: Prisma.InputJsonValue): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { operationalReadiness: readiness },
        });
    }
}
