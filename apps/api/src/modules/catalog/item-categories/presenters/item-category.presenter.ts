import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import { ItemCategoryWithParent } from '../repositories/item-categories.repository';
import { ItemCategoryResponseDto } from '../dto';

@Injectable()
export class ItemCategoryPresenter extends CrudPresenter<ItemCategoryWithParent, ItemCategoryResponseDto> {
    toResponse(entity: ItemCategoryWithParent): ItemCategoryResponseDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description ?? '',
            // imageUrl: entity.imageUrl ?? null,
            imageUrl:"",
            parentId: entity.parentId ?? null,
            parent: entity.parent ? { id: entity.parent.id, name: entity.parent.name } : null,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
