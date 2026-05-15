import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Role } from '@devloggers/db-prisma';
import { RoleResponseDto } from '../dto';

@Injectable()
export class RolePresenter extends CrudPresenter<Role, RoleResponseDto> {
    toResponse(entity: Role): RoleResponseDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description ?? null,
            isSystem: entity.isSystem ?? false,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
