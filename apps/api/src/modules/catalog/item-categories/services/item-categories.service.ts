import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { ItemCategory } from '@devloggers/db-prisma';
import { ItemCategoriesRepository } from '../repositories/item-categories.repository';
import { ItemCategoryPresenter } from '../presenters/item-category.presenter';
import { CreateItemCategoryDto, UpdateItemCategoryDto, ItemCategoryResponseDto } from '../dto';
@Injectable()
export class ItemCategoriesService extends CrudService<ItemCategory, ItemCategoryResponseDto, CreateItemCategoryDto, UpdateItemCategoryDto> {
    protected readonly resourceName = resources.itemCategories.key;

    constructor(
        private readonly itemCategoriesRepository: ItemCategoriesRepository,
        private readonly itemCategoryPresenter: ItemCategoryPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(itemCategoriesRepository, itemCategoryPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateItemCategoryDto): Promise<void> {
        const taken = await this.itemCategoriesRepository.isNameTaken(tenantId, dto.name);
        if (taken) {
            throw new ConflictException(`An item category named "${dto.name}" already exists`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateItemCategoryDto,
    ): Promise<void> {
        if (dto.name) {
            const taken = await this.itemCategoriesRepository.isNameTaken(tenantId, dto.name, id);
            if (taken) {
                throw new ConflictException(`An item category named "${dto.name}" already exists`);
            }
        }
    }
}
