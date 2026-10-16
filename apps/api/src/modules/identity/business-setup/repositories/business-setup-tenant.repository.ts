import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

const TENANT_SETUP_STATE_SELECT = {
    businessSetupCompletedAt: true,
    operationalReadiness: true,
} satisfies Prisma.TenantSelect;

export type TenantSetupState = Prisma.TenantGetPayload<{ select: typeof TENANT_SETUP_STATE_SELECT }>;

@Injectable()
export class BusinessSetupTenantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findSetupState(tenantId: string): Promise<TenantSetupState | null> {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: TENANT_SETUP_STATE_SELECT,
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
