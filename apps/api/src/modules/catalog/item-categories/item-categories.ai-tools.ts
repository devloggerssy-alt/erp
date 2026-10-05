import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ItemCategoriesService } from './services/item-categories.service';
import { CreateItemCategoryDto, UpdateItemCategoryDto } from './dto';
import { ITEM_CATEGORIES_FILTER_SCHEMA } from './controllers/item-categories.controller';

@AiToolProvider()
@Injectable()
export class ItemCategoriesAiTools implements AiToolSource {
    constructor(private readonly categories: ItemCategoriesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'item-categories',
            resource: resources.itemCategories.key,
            domain: 'catalog',
            label: 'item category',
            service: this.categories,
            createDto: CreateItemCategoryDto,
            updateDto: UpdateItemCategoryDto,
            filterSchema: ITEM_CATEGORIES_FILTER_SCHEMA,
            searchFields: ['name'],
            permissions: {
                view: 'itemCategories.view',
                create: 'itemCategories.create',
                update: 'itemCategories.update',
                delete: 'itemCategories.delete',
            },
            ops: ['list', 'show', 'create', 'update', 'delete'],
        });
    }
}
