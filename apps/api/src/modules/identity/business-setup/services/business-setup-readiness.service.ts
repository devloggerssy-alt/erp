import { Injectable } from '@nestjs/common';
import type { SetupTask, Prisma } from '@devloggers/db-prisma';
import { SetupTasksRepository } from '../repositories/setup-tasks.repository';
import { BusinessSetupTenantRepository } from '../repositories/business-setup-tenant.repository';
import { computeOperationalReadiness, type OperationalReadiness } from '../constants/operational-readiness';

@Injectable()
export class BusinessSetupReadinessService {
    constructor(
        private readonly tasksRepository: SetupTasksRepository,
        private readonly tenantRepository: BusinessSetupTenantRepository,
    ) {}

    /**
     * Recomputes the per-module readiness from the tenant's setup tasks and
     * caches it on `Tenant.operationalReadiness`. The write is skipped when the
     * module states are unchanged so `GET /business-setup/state` stays read-mostly.
     */
    async refresh(tenantId: string, tasks?: SetupTask[]): Promise<OperationalReadiness> {
        const current = tasks ?? (await this.tasksRepository.listForTenant(tenantId));
        const computed = computeOperationalReadiness(current, new Date());

        const stored = await this.tenantRepository.findSetupState(tenantId);
        const storedModules = (stored?.operationalReadiness as { modules?: unknown } | null)?.modules ?? null;

        if (JSON.stringify(storedModules) !== JSON.stringify(computed.modules)) {
            await this.tenantRepository.setOperationalReadiness(
                tenantId,
                computed as unknown as Prisma.InputJsonValue,
            );
        }

        return computed;
    }
}
