import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { StockCountsService } from './stock-counts.service';
import { CreateStockCountDto } from './dto/stock-count.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Stock Counts')
@Controller('stock-counts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StockCountsController {
    constructor(private readonly stockCountsService: StockCountsService) {}

    @Get()
    @ApiOperation({ summary: 'List all stock counts' })
    @ApiOkResponse({
        description: 'Paginated list of stock counts',
        schema: {
            example: {
                message: 'Stock counts list',
                data: [
                    { id: '...', warehouseId: '00000000-0000-4000-ab00-000000000001', status: 'DRAFT', countedAt: '2026-04-14' },
                ],
                meta: { pagination: { total: 2, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.stockCountsService.findAll(user.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 50);
        return ApiResponseBuilder.success(result.data, 'Stock counts list', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get stock count by ID' })
    @ApiOkResponse({
        description: 'Stock count details with lines',
        schema: {
            example: {
                message: 'Stock count details',
                data: {
                    id: '...', warehouseId: '00000000-0000-4000-ab00-000000000001', status: 'DRAFT',
                    lines: [{ itemId: '00000000-0000-4000-a900-000000000001', expectedQuantity: 50, countedQuantity: 48 }],
                },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.stockCountsService.findById(user.tenantId, id), 'Stock count details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new stock count' })
    @ApiCreatedResponse({
        description: 'Stock count created in DRAFT status',
        schema: {
            example: {
                message: 'Stock count created',
                data: { id: '...', warehouseId: '00000000-0000-4000-ab00-000000000001', status: 'DRAFT' },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateStockCountDto) {
        return ApiResponseBuilder.success(await this.stockCountsService.create(user.tenantId, user.id, dto), 'Stock count created');
    }

    @Post(':id/post')
    @ApiOperation({
        summary: 'Post (confirm) a stock count',
        description: 'Finalizes a DRAFT stock count. Compares counted quantities with current balances and creates ADJUSTMENT stock movements for any discrepancies. This adjusts actual inventory to match the physical count.',
    })
    @ApiOkResponse({
        description: 'Stock count posted – adjustment movements created',
        schema: {
            example: {
                message: 'Stock count posted',
                data: { id: '...', status: 'POSTED', postedAt: '2026-04-14T12:00:00.000Z', adjustments: 2 },
            },
        },
    })
    @ApiStandardErrors()
    async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.stockCountsService.post(user.tenantId, id, user.id), 'Stock count posted');
    }
}
