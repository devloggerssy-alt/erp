import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { ItemCategory } from '@devloggers/db-prisma';
import { ItemCategoryResponseDto } from '../dto';

@Injectable()
export class ItemCategoryPresenter extends CrudPresenter<ItemCategory, ItemCategoryResponseDto> {
    toResponse(entity: ItemCategory): ItemCategoryResponseDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description ?? '',
            parentId: entity.parentId ?? null,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
