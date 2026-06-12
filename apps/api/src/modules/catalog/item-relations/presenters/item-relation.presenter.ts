import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { ItemRelation } from '@devloggers/db-prisma';
import { ItemRelationResponseDto } from '../dto';
import type { RelationType } from '@devloggers/api-contracts';

type ItemRelationWithRelated = ItemRelation & {
  relatedItem: { id: string; name: string; code: string };
};

@Injectable()
export class ItemRelationPresenter extends CrudPresenter<ItemRelation, ItemRelationResponseDto> {
  toResponse(entity: ItemRelation): ItemRelationResponseDto {
    const e = entity as ItemRelationWithRelated;
    return {
      id: e.id,
      itemId: e.itemId,
      relatedItemId: e.relatedItemId,
      relationType: e.relationType as RelationType,
      notes: e.notes ?? null,
      relatedItem: {
        id: e.relatedItem.id,
        name: e.relatedItem.name,
        code: e.relatedItem.code,
      },
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
