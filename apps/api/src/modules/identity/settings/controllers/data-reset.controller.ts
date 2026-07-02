import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { DataResetService } from '../services/data-reset.service';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '../../../../common/decorators/api-swagger.decorators';
import {
    ResetFinanceDto,
    ResetInventoryDto,
    FinanceResetResultDto,
    InventoryResetResultDto,
} from '../dto/data-reset.dto';

@ApiTags('Settings')
@Controller('settings/danger')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DataResetController {
    constructor(private readonly dataResetService: DataResetService) {}

    @Post('reset-finance')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Reset all financial records',
        description:
            'DANGER: permanently deletes every payment, invoice, expense and journal entry for the ' +
            'tenant and zeroes cashbox and GL account balances. Master data is preserved. ' +
            'Requires the exact confirmation phrase in the body.',
    })
    @ApiBody({ type: ResetFinanceDto })
    @ApiOkResponseStandard(FinanceResetResultDto, { description: 'Financial records reset; returns deletion counts' })
    @ApiStandardErrors()
    async resetFinance(@CurrentUser() user: RequestUser, @Body() _dto: ResetFinanceDto) {
        const result = await this.dataResetService.resetFinance(user.tenantId);
        return ApiResponseBuilder.success(result, 'Financial records reset');
    }

    @Post('reset-inventory')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Reset all inventory records',
        description:
            'DANGER: permanently deletes every stock movement, stock count and stock balance for the ' +
            'tenant. Warehouses and items are preserved. Requires the exact confirmation phrase in the body.',
    })
    @ApiBody({ type: ResetInventoryDto })
    @ApiOkResponseStandard(InventoryResetResultDto, { description: 'Inventory records reset; returns deletion counts' })
    @ApiStandardErrors()
    async resetInventory(@CurrentUser() user: RequestUser, @Body() _dto: ResetInventoryDto) {
        const result = await this.dataResetService.resetInventory(user.tenantId);
        return ApiResponseBuilder.success(result, 'Inventory records reset');
    }
}
