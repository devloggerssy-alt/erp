import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto, UpdateItemStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) {}

    @Get()
    @ApiOperation({ summary: 'List all items (products)' })
    @ApiOkResponse({
        description: 'Paginated list of items',
        schema: {
            example: {
                message: 'Items list',
                data: [
                    { id: '00000000-0000-4000-a900-000000000001', name: 'Laptop 15"', code: 'ITEM-001', isActive: true, categoryId: '00000000-0000-4000-a700-000000000001' },
                    { id: '00000000-0000-4000-a900-000000000002', name: 'Smartphone X', code: 'ITEM-002', isActive: true },
                ],
                meta: { pagination: { total: 10, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async findAll(
        @CurrentUser() user: RequestUser,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.itemsService.findAll(user.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 50);
        return ApiResponseBuilder.success(result.data, 'Items list', {
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get item by ID' })
    @ApiOkResponse({
        description: 'Item details returned',
        schema: {
            example: {
                message: 'Item details',
                data: { id: '00000000-0000-4000-a900-000000000001', name: 'Laptop 15"', code: 'ITEM-001', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
    ) {
        const item = await this.itemsService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(item, 'Item details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new item' })
    @ApiCreatedResponse({
        description: 'Item created',
        schema: {
            example: {
                message: 'Item created',
                data: { id: '00000000-0000-4000-a900-000000000003', name: 'Tablet Pro', code: 'ITEM-003', isActive: true },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateItemDto) {
        const created = await this.itemsService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'Item created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an item' })
    @ApiOkResponse({
        description: 'Item updated',
        schema: {
            example: {
                message: 'Item updated',
                data: { id: '00000000-0000-4000-a900-000000000001', name: 'Laptop 15" (Updated)' },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateItemDto,
    ) {
        const updated = await this.itemsService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Item updated');
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Toggle item active status', description: 'Activates or deactivates an item. Deactivated items cannot be used in new invoices or transactions.' })
    @ApiOkResponse({
        description: 'Item status updated',
        schema: {
            example: {
                message: 'Item status updated',
                data: { id: '00000000-0000-4000-a900-000000000001', isActive: false },
            },
        },
    })
    @ApiStandardErrors()
    async updateStatus(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateItemStatusDto,
    ) {
        const updated = await this.itemsService.updateStatus(user.tenantId, id, dto.isActive);
        return ApiResponseBuilder.success(updated, 'Item status updated');
    }
}
