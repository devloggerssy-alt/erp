import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { StockLedgerService } from './stock-ledger.service';
import { StockMovementResponseDto } from './dto/stock-ledger.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import { ApiOkResponsePaginated, ApiStandardErrors } from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Stock Ledger')
@Controller('stock-ledger')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class StockLedgerController {
    constructor(private readonly ledgerService: StockLedgerService) {}

    @Get('movements')
    @RequirePermission('stockLedger.view')
    @ApiOperation({ summary: 'List stock movements', description: 'Returns a paginated history of stock movements (purchases, sales, adjustments, opening balances). Filter by warehouse, item, or movement type.' })
    @ApiQuery({ name: 'warehouseId', required: false, type: String })
    @ApiQuery({ name: 'itemId', required: false, type: String })
    @ApiQuery({ name: 'movementType', required: false, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiOkResponsePaginated(StockMovementResponseDto, { description: 'Paginated list of stock movements' })
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
