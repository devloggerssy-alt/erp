import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { BalanceResponseDto, OpeningBalanceRegisteredResponseDto, PostOpeningBalanceDto } from './dto/inventory.dto';
import { JwtAuthGuard, PermissionsGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiCreatedResponseStandard, ApiOkResponseStandard, ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Get('balances')
    @RequirePermission('inventory.view')
    @ApiOperation({ summary: 'Get current stock balances', description: 'Returns the current quantity-on-hand for each item per warehouse. Optionally filter by a specific warehouse or item.' })
    @ApiQuery({ name: 'warehouseId', required: false, type: String })
    @ApiQuery({ name: 'itemId', required: false, type: String })
    @ApiOkResponseStandard(BalanceResponseDto, { isArray: true, description: 'Stock balances retrieved' })
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
    @RequirePermission('openingBalances.manage')
    @ApiOperation({
        summary: 'Register opening stock balances',
        description: 'Records initial stock quantities for items in a warehouse. Used during system setup to enter existing inventory. Creates stock ledger movement entries of type OPENING_BALANCE.',
    })
    @ApiCreatedResponseStandard(OpeningBalanceRegisteredResponseDto, {
        description: 'Opening balances registered – stock ledger entries created',
    })
    @ApiStandardErrors()
    async registerOpeningBalances(@CurrentUser() user: RequestUser, @Body() dto: PostOpeningBalanceDto) {
        const result = await this.inventoryService.registerOpeningBalance(user.tenantId, user.id, dto);
        return ApiResponseBuilder.success(result, 'Opening balances registered successfully');
    }
}
