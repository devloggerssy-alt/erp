import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { SetupTask } from '@devloggers/db-prisma';
import { SetupTaskResponseDto } from '../dto';

@Injectable()
export class SetupTaskPresenter extends CrudPresenter<SetupTask, SetupTaskResponseDto> {
    toResponse(entity: SetupTask): SetupTaskResponseDto {
        return {
            id: entity.id,
            type: entity.type,
            status: entity.status,
            required: entity.required,
            dependencies: entity.dependencies,
            metadata: entity.metadata as Record<string, unknown> | null,
            progress: entity.progress as Record<string, unknown> | null,
            completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
