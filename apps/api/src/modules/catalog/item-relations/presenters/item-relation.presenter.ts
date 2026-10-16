import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import { ItemRelationResponseDto } from '../dto';
import type { RelationType } from '@devloggers/api-contracts';
import type { ItemRelationWithRelatedItem } from '../repositories/item-relations.repository';

@Injectable()
export class ItemRelationPresenter extends CrudPresenter<ItemRelationWithRelatedItem, ItemRelationResponseDto> {
  toResponse(entity: ItemRelationWithRelatedItem): ItemRelationResponseDto {
    return {
      id: entity.id,
      itemId: entity.itemId,
      relatedItemId: entity.relatedItemId,
      relationType: entity.relationType as RelationType,
      notes: entity.notes ?? null,
      relatedItem: {
        id: entity.relatedItem.id,
        name: entity.relatedItem.name,
        code: entity.relatedItem.code,
      },
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
