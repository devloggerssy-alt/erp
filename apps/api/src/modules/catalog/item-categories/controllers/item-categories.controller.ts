import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ItemCategoriesService } from '../services/item-categories.service';
import { CreateItemCategoryDto, UpdateItemCategoryDto, ItemCategoryResponseDto } from '../dto';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const ITEM_CATEGORIES_OPENAPI = {
    list: {
        operation: { summary: 'List item categories' },
        responseDescription: 'Paginated list of item categories',
    },
    show: {
        operation: { summary: 'Get an item category by ID' },
        responseDescription: 'Item category details',
        idParam: { description: 'Item category UUID' },
    },
    create: {
        operation: { summary: 'Create an item category' },
        responseDescription: 'Item category created successfully',
    },
    update: {
        operation: { summary: 'Update an item category' },
        responseDescription: 'Updated item category',
        idParam: { description: 'Item category UUID' },
    },
    delete: {
        operation: { summary: 'Delete an item category' },
        noContentDescription: 'Item category deleted successfully',
        idParam: { description: 'Item category UUID' },
    },
} satisfies CrudOpenApi;

const ItemCategoriesCrudBase = createCrudController({
    responseDto: ItemCategoryResponseDto,
    createDto: CreateItemCategoryDto,
    updateDto: UpdateItemCategoryDto,
    openApi: ITEM_CATEGORIES_OPENAPI,
    
});

@ApiTags('Catalog / Item Categories')
@Controller('item-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemCategoriesController extends ItemCategoriesCrudBase {
    constructor(private readonly itemCategoriesService: ItemCategoriesService) {
        super(itemCategoriesService, 'Item Category');
    }
}

