import { Injectable, NotFoundException } from '@nestjs/common';
import type { SetupTask, SetupTaskType, SetupTaskStatus, Prisma } from '@devloggers/db-prisma';
import { SetupTasksRepository } from '../repositories/setup-tasks.repository';
import { SETUP_TASK_DEPENDENCIES } from '../constants/setup-task-graph';
import type { SetupTaskPlanItem } from './business-setup-plan.service';

@Injectable()
export class BusinessSetupTaskService {
    constructor(private readonly repository: SetupTasksRepository) {}

    async upsertPlan(tenantId: string, items: SetupTaskPlanItem[]): Promise<void> {
        for (const item of items) {
            const existing = await this.repository.findByType(tenantId, item.type);
            const metadata = item.metadata as Prisma.InputJsonValue | undefined;

            if (!existing) {
                await this.repository.upsertByType(tenantId, item.type, {
                    required: item.required,
                    dependencies: item.dependencies,
                    metadata,
                    status: item.required ? 'BLOCKED' : 'SKIPPED',
                });
                continue;
            }

            if (existing.status === 'COMPLETED') {
                await this.repository.upsertByType(tenantId, item.type, { metadata });
                continue;
            }

            await this.repository.upsertByType(tenantId, item.type, {
                required: item.required,
                dependencies: item.dependencies,
                metadata,
                status: item.required ? existing.status : 'SKIPPED',
            });
        }
        await this.resolveStatuses(tenantId);
    }

    async resolveStatuses(tenantId: string): Promise<void> {
        const tasks = await this.repository.listForTenant(tenantId);
        const statusByType = new Map<SetupTaskType, SetupTaskStatus>(tasks.map((t) => [t.type, t.status]));

        for (const task of tasks) {
            if (task.status === 'COMPLETED' || task.status === 'SKIPPED') continue;

            const deps = SETUP_TASK_DEPENDENCIES[task.type];
            const ready = deps.every((dep) => {
                const depStatus = statusByType.get(dep);
                return depStatus === 'COMPLETED' || depStatus === 'SKIPPED';
            });
            const nextStatus: SetupTaskStatus = ready ? 'READY' : 'BLOCKED';

            if (nextStatus !== task.status) {
                await this.repository.upsertByType(tenantId, task.type, { status: nextStatus });
            }
        }
    }

    async recordAttempt(tenantId: string, type: SetupTaskType, completed: boolean, details?: Record<string, unknown>): Promise<void> {
        await this.repository.upsertByType(tenantId, type, {
            progress: details as Prisma.InputJsonValue,
            ...(completed ? { status: 'COMPLETED', completedAt: new Date() } : {}),
        });
        if (completed) {
            await this.resolveStatuses(tenantId);
        }
    }

    async listForTenant(tenantId: string): Promise<SetupTask[]> {
        return this.repository.listForTenant(tenantId);
    }

    async getTaskOrFail(tenantId: string, type: SetupTaskType): Promise<SetupTask> {
        const task = await this.repository.findByType(tenantId, type);
        if (!task) {
            throw new NotFoundException(`Setup task "${type}" not found for this tenant`);
        }
        return task;
    }
}
