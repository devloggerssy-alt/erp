import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BalanceDriftService } from './balance-drift.service';
import { BalanceDriftReportDto } from './dto/balance-drift.dto';
import { JwtAuthGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import {
    ApiOkResponseStandard,
    ApiStandardErrors,
} from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Accounting / Reconciliation')
@Controller('accounting/reconciliation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BalanceDriftController {
    constructor(private readonly balanceDriftService: BalanceDriftService) {}

    @Get('balance-drift')
    @ApiOperation({
        summary: 'Balance drift report',
        description:
            'Compares denormalized balance caches (Cashbox.balance, StockBalance.quantity) ' +
            'against their ledger source of truth, and verifies every posted journal entry ' +
            'balances. Read-only and safe to run at any time. ' +
            'Record a baseline before the Phase 1 posting refactor: pre-existing drift is not ' +
            'a regression, only an increase is.',
    })
    @ApiOkResponseStandard(BalanceDriftReportDto, { description: 'Drift report for the tenant' })
    @ApiStandardErrors()
    async getBalanceDrift(@CurrentUser() user: RequestUser) {
        const report = await this.balanceDriftService.getReport(user.tenantId);
        return ApiResponseBuilder.success(report, 'Balance drift report');
    }
}
