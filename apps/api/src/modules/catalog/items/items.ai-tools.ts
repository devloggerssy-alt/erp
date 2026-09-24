import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ItemsService } from './services/items.service';
import { CreateItemDto, UpdateItemDto } from './dto';
import { ITEMS_FILTER_SCHEMA } from './controllers/items.controller';

@AiToolProvider()
@Injectable()
export class ItemsAiTools implements AiToolSource {
    constructor(private readonly items: ItemsService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'items',
            resource: resources.items.key,
            domain: 'catalog',
            label: 'item (product, service or part)',
            service: this.items,
            createDto: CreateItemDto,
            updateDto: UpdateItemDto,
            filterSchema: ITEMS_FILTER_SCHEMA,
            searchFields: ['name', 'code'],
            permissions: { view: 'items.view', create: 'items.create', update: 'items.update' },
        });
    }
}
