import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import { ItemCatalogEntityResponseDto } from '../dto';
import type { ItemCatalogEntityWithRelations } from '../repositories/item-catalog-entities.repository';

@Injectable()
export class ItemCatalogEntityPresenter extends CrudPresenter<
  ItemCatalogEntityWithRelations,
  ItemCatalogEntityResponseDto
> {
  toResponse(entity: ItemCatalogEntityWithRelations): ItemCatalogEntityResponseDto {
    return {
      id: entity.id,
      itemId: entity.itemId,
      catalogEntityId: entity.catalogEntityId,
      catalogEntity: {
        id: entity.catalogEntity.id,
        name: entity.catalogEntity.name,
        kind: entity.catalogEntity.kind,
        parentId: entity.catalogEntity.parentId,
      },
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
