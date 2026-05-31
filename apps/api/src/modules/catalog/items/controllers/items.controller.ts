import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ItemsService } from '../services/items.service';
import { CreateItemDto, UpdateItemDto, ItemResponseDto } from '../dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { itemCategoryResource, itemResource } from '@devloggers/api-contracts';

const ITEMS_OPENAPI = {
    list: {
        operation: { summary: 'List catalog items' },
        responseDescription: 'Paginated list of items',
    },
    show: {
        operation: { summary: 'Get an item by ID' },
        responseDescription: 'Item details',
        idParam: { description: 'Item UUID' },
    },
    create: {
        operation: { summary: 'Create an item', description: 'Item code must be unique within the tenant.' },
        responseDescription: 'Item created successfully',
    },
    update: {
        operation: { summary: 'Update an item', description: 'Partial update — only provided fields are changed.' },
        responseDescription: 'Updated item',
        idParam: { description: 'Item UUID' },
    },
    delete: {
        operation: { summary: 'Delete an item' },
        noContentDescription: 'Item deleted successfully',
        idParam: { description: 'Item UUID' },
    },
} satisfies CrudOpenApi;

const ItemsCrudBase = createCrudController({
    responseDto: ItemResponseDto,
    createDto: CreateItemDto,
    updateDto: UpdateItemDto,
    filterSchema: [
        { field: 'categoryId', type: 'id', foreignResourceKey: itemCategoryResource.key },
        { field: 'name', type: 'string' },
        { field: 'code', type: 'string' },
        { field: 'defaultSellingPrice', type: 'number' },
        { field: 'isActive', type: 'boolean' },
        { field: 'createdAt', type: 'date' },
    ],
    openApi: ITEMS_OPENAPI,
});

@ApiTags('Catalog / Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemsController extends ItemsCrudBase {
    constructor(private readonly itemsService: ItemsService) {
        super(itemsService, 'Item');
    }
}
