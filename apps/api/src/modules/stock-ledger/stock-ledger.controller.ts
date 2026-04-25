import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { StockLedgerService } from './stock-ledger.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Stock Ledger')
@Controller('stock-ledger')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StockLedgerController {
    constructor(private readonly ledgerService: StockLedgerService) {}

    @Get('movements')
    @ApiOperation({ summary: 'List stock movements', description: 'Returns a paginated history of stock movements (purchases, sales, adjustments, opening balances). Filter by warehouse, item, or movement type.' })
    @ApiQuery({ name: 'warehouseId', required: false })
    @ApiQuery({ name: 'itemId', required: false })
    @ApiQuery({ name: 'movementType', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({
        description: 'Paginated list of stock movements',
        schema: {
            example: {
                message: 'Movements retrieved',
                data: [
                    {
                        id: '...', movementType: 'PURCHASE', quantity: 5,
                        itemId: '00000000-0000-4000-a900-000000000001', itemName: 'Laptop 15"',
                        warehouseId: '00000000-0000-4000-ab00-000000000001', warehouseName: 'Main Warehouse',
                        createdAt: '2026-04-14T12:00:00.000Z',
                    },
                ],
                meta: { pagination: { total: 25, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async getMovements(
        @CurrentUser() user: RequestUser,
        @Query('warehouseId') warehouseId?: string,
        @Query('itemId') itemId?: string,
        @Query('movementType') movementType?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.ledgerService.findMovements(user.tenantId, {
            warehouseId,
            itemId,
            movementType,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });

        return ApiResponseBuilder.success(result.data, 'Movements retrieved', {
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    }
}
