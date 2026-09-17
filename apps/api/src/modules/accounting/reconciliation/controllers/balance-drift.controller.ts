import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BalanceDriftService } from '../services/balance-drift.service';
import { BalanceDriftReportDto } from '../dto/balance-drift.dto';
import { JwtAuthGuard } from '../../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import {
    ApiOkResponseStandard,
    ApiStandardErrors,
} from '../../../../common/decorators/api-swagger.decorators';

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
            'Runs the reconciliation stack (00-accounting-principles.md): cash/bank/AR/AP control ' +
            'accounts vs their subledgers, cashbox and bank projections vs subledger, inventory GL vs ' +
            'stock valuation, journal-entry balance, txn amount × rate = base, and stock quantity ' +
            'projection. Read-only. Pre-existing drift is not a regression; only an increase is ' +
            '(see ReconciliationRun).',
    })
    @ApiOkResponseStandard(BalanceDriftReportDto, { description: 'Drift report for the tenant' })
    @ApiStandardErrors()
    async getBalanceDrift(@CurrentUser() user: RequestUser) {
        const report = await this.balanceDriftService.getReport(user.tenantId);
        return ApiResponseBuilder.success(report, 'Balance drift report');
    }
}
