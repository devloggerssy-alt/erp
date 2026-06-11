import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Item } from '@devloggers/db-prisma';
import { ItemResponseDto } from '../dto';

@Injectable()
export class ItemPresenter extends CrudPresenter<Item, ItemResponseDto> {
    toResponse(entity: Item): ItemResponseDto {
        return {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            barcode: entity.barcode ?? null,
            categoryId: entity.categoryId,
            baseUnitId: entity.baseUnitId,
            defaultSellingPrice: entity.defaultSellingPrice ?? null,
            latestPurchasePrice: entity.latestPurchasePrice ?? null,
            isActive: entity.isActive,
            itemType: entity.itemType,
            customFields: {},
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
