import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import { CatalogEntityResponseDto } from '../dto';
import type { CatalogEntityWithParent } from '../repositories/catalog-entities.repository';

@Injectable()
export class CatalogEntityPresenter extends CrudPresenter<
  CatalogEntityWithParent,
  CatalogEntityResponseDto
> {
  toResponse(entity: CatalogEntityWithParent): CatalogEntityResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      parentId: entity.parentId,
      parent: entity.parent
        ? { id: entity.parent.id, name: entity.parent.name, kind: entity.parent.kind }
        : null,
      // Safe cast: input validated by @IsObject(), so stored value is always an object or null
      attributes: entity.attributes as Record<string, unknown> | null,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
