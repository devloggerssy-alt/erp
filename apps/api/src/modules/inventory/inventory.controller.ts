import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { PostOpeningBalanceDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Get('balances')
    @ApiOperation({ summary: 'Get current stock balances', description: 'Returns the current quantity-on-hand for each item per warehouse. Optionally filter by a specific warehouse or item.' })
    @ApiOkResponse({
        description: 'Stock balances retrieved',
        schema: {
            example: {
                message: 'Stock balances retrieved',
                data: [
                    { warehouseId: '00000000-0000-4000-ab00-000000000001', itemId: '00000000-0000-4000-a900-000000000001', quantity: 50, itemName: 'Laptop 15"', warehouseName: 'Main Warehouse' },
                    { warehouseId: '00000000-0000-4000-ab00-000000000001', itemId: '00000000-0000-4000-a900-000000000002', quantity: 120, itemName: 'Smartphone X', warehouseName: 'Main Warehouse' },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async getBalances(
        @CurrentUser() user: RequestUser,
        @Query('warehouseId') warehouseId?: string,
        @Query('itemId') itemId?: string,
    ) {
        const result = await this.inventoryService.getBalances(user.tenantId, {
            warehouseId,
            itemId,
        });
        return ApiResponseBuilder.success(result, 'Stock balances retrieved');
    }

    @Post('opening-balances')
    @ApiOperation({
        summary: 'Register opening stock balances',
        description: 'Records initial stock quantities for items in a warehouse. Used during system setup to enter existing inventory. Creates stock ledger movement entries of type OPENING_BALANCE.',
    })
    @ApiCreatedResponse({
        description: 'Opening balances registered – stock ledger entries created',
        schema: {
            example: {
                message: 'Opening balances registered successfully',
                data: { count: 3, warehouseId: '00000000-0000-4000-ab00-000000000001' },
            },
        },
    })
    @ApiStandardErrors()
    async registerOpeningBalances(@CurrentUser() user: RequestUser, @Body() dto: PostOpeningBalanceDto) {
        const result = await this.inventoryService.registerOpeningBalance(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(result, 'Opening balances registered successfully');
    }
}
