import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { SetupTask, SetupTaskType, SetupTaskStatus, Prisma } from '@devloggers/db-prisma';

export interface UpsertSetupTaskData {
    status?: SetupTaskStatus;
    required?: boolean;
    dependencies?: SetupTaskType[];
    metadata?: Prisma.InputJsonValue;
    progress?: Prisma.InputJsonValue;
    completedAt?: Date | null;
}

@Injectable()
export class SetupTasksRepository extends CrudRepository<SetupTask, Prisma.SetupTaskDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.setupTask);
    }

    async findByType(tenantId: string, type: SetupTaskType): Promise<SetupTask | null> {
        return this.prisma.setupTask.findUnique({ where: { tenantId_type: { tenantId, type } } });
    }

    async listForTenant(tenantId: string): Promise<SetupTask[]> {
        return this.prisma.setupTask.findMany({ where: { tenantId }, orderBy: { type: 'asc' } });
    }

    async upsertByType(tenantId: string, type: SetupTaskType, data: UpsertSetupTaskData): Promise<SetupTask> {
        return this.prisma.setupTask.upsert({
            where: { tenantId_type: { tenantId, type } },
            create: { tenantId, type, status: data.status ?? 'BLOCKED', required: data.required ?? true, dependencies: data.dependencies ?? [], metadata: data.metadata, progress: data.progress, completedAt: data.completedAt ?? null },
            update: data,
        });
    }
}
