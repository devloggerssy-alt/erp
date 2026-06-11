import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { ItemRelation } from '@devloggers/db-prisma';
import { ItemRelationResponseDto } from '../dto';
import type { RelationType } from '@devloggers/api-contracts';

@Injectable()
export class ItemRelationPresenter extends CrudPresenter<ItemRelation, ItemRelationResponseDto> {
  toResponse(entity: ItemRelation): ItemRelationResponseDto {
    return {
      id: entity.id,
      itemId: entity.itemId,
      relatedItemId: entity.relatedItemId,
      relationType: entity.relationType as RelationType,
      notes: entity.notes ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
