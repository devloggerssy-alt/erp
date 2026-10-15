import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StockCountsService } from './stock-counts.service';
import { CreateStockCountDto, StockCountResponseDto } from './dto/stock-count.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import {
    ApiCreatedResponseStandard,
    ApiOkResponsePaginated,
    ApiOkResponseStandard,
    ApiStandardErrors,
} from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Stock Counts')
@Controller('stock-counts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class StockCountsController {
    constructor(private readonly stockCountsService: StockCountsService) {}

    @Get()
    @RequirePermission('stockCounts.view')
    @ApiOperation({ summary: 'List all stock counts' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiOkResponsePaginated(StockCountResponseDto, { description: 'Paginated list of stock counts' })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.stockCountsService.findAll(user.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 50);
        return ApiResponseBuilder.success(result.data, 'Stock counts list', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get(':id')
    @RequirePermission('stockCounts.view')
    @ApiOperation({ summary: 'Get stock count by ID' })
    @ApiOkResponseStandard(StockCountResponseDto, { description: 'Stock count details with lines' })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.stockCountsService.findById(user.tenantId, id), 'Stock count details');
    }

    @Post()
    @RequirePermission('stockCounts.create')
    @ApiOperation({ summary: 'Create a new stock count' })
    @ApiCreatedResponseStandard(StockCountResponseDto, { description: 'Stock count created in DRAFT status' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateStockCountDto) {
        return ApiResponseBuilder.success(await this.stockCountsService.create(user.tenantId, user.id, dto), 'Stock count created');
    }

    @Post(':id/post')
    @RequirePermission('stockCounts.post')
    @ApiOperation({
        summary: 'Post (confirm) a stock count',
        description: 'Finalizes a DRAFT stock count. Compares counted quantities with current balances and creates ADJUSTMENT stock movements for any discrepancies. This adjusts actual inventory to match the physical count.',
    })
    @ApiCreatedResponseStandard(StockCountResponseDto, {
        description: 'Stock count posted – adjustment movements created',
    })
    @ApiStandardErrors()
    async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.stockCountsService.post(user.tenantId, id, user.id), 'Stock count posted');
    }
}
