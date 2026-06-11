import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Tag } from '@devloggers/db-prisma';
import { TagResponseDto } from '../dto';

@Injectable()
export class TagPresenter extends CrudPresenter<Tag, TagResponseDto> {
  toResponse(entity: Tag): TagResponseDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      name: entity.name,
      color: entity.color ?? null,
      module: entity.module,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
