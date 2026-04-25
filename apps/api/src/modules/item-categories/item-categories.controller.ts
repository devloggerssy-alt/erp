import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { ItemCategoriesService } from './item-categories.service';
import { CreateItemCategoryDto, UpdateItemCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Item Categories')
@Controller('item-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemCategoriesController {
    constructor(private readonly categoriesService: ItemCategoriesService) {}

    @Get()
    @ApiOperation({ summary: 'List all item categories' })
    @ApiOkResponse({
        description: 'Categories list retrieved',
        schema: {
            example: {
                message: 'Categories list',
                data: [
                    { id: '00000000-0000-4000-a700-000000000001', name: 'Electronics', slug: 'electronics', parentId: null },
                    { id: '00000000-0000-4000-a700-000000000002', name: 'Smartphones', slug: 'smartphones', parentId: '00000000-0000-4000-a700-000000000001' },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const result = await this.categoriesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(result.data, 'Categories list');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID' })
    @ApiOkResponse({
        description: 'Category details returned',
        schema: {
            example: {
                message: 'Category details',
                data: { id: '00000000-0000-4000-a700-000000000001', name: 'Electronics', slug: 'electronics', parentId: null },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
    ) {
        const category = await this.categoriesService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(category, 'Category details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new item category' })
    @ApiCreatedResponse({
        description: 'Category created',
        schema: {
            example: {
                message: 'Category created',
                data: { id: '00000000-0000-4000-a700-000000000003', name: 'Accessories', slug: 'accessories', parentId: null },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateItemCategoryDto) {
        const created = await this.categoriesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'Category created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an item category' })
    @ApiOkResponse({
        description: 'Category updated',
        schema: {
            example: {
                message: 'Category updated',
                data: { id: '00000000-0000-4000-a700-000000000001', name: 'Electronics & Gadgets', slug: 'electronics-gadgets' },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateItemCategoryDto,
    ) {
        const updated = await this.categoriesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Category updated');
    }
}
