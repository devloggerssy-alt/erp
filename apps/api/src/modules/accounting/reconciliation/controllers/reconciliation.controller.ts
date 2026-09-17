import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import {
    ApiCreatedResponseStandard,
    ApiOkResponseStandard,
    ApiStandardErrors,
} from '../../../../common/decorators/api-swagger.decorators';
import { BusinessSetupReconciliationService } from '../services/business-setup-reconciliation.service';
import { ReconciliationMonitorService } from '../services/reconciliation-monitor.service';
import { ReconciliationRunsRepository } from '../repositories/reconciliation-runs.repository';
import { ReconciliationResultDto } from '../dto/reconciliation.dto';
import { ReconciliationRunResponseDto, toRunResponse } from '../dto/reconciliation-run.dto';

const RECENT_RUNS = 30;

@ApiTags('Accounting / Reconciliation')
@Controller('accounting/reconciliation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReconciliationController {
    constructor(
        private readonly reconciliation: BusinessSetupReconciliationService,
        private readonly monitor: ReconciliationMonitorService,
        private readonly runs: ReconciliationRunsRepository,
    ) {}

    @Get('checks')
    @ApiOperation({
        summary: 'Reconciliation checks (live)',
        description: 'Evaluates the 8-check reconciliation stack now. Read-only; nothing is stored.',
    })
    @ApiOkResponseStandard(ReconciliationResultDto, { description: 'Per-check pass/fail with full findings' })
    @ApiStandardErrors()
    async getChecks(@CurrentUser() user: RequestUser) {
        const result = await this.reconciliation.evaluate(user.tenantId);
        return ApiResponseBuilder.success(result, 'Reconciliation checks');
    }

    @Get('runs')
    @ApiOperation({ summary: 'Recent reconciliation runs', description: `The ${RECENT_RUNS} most recent stored runs, newest first.` })
    @ApiOkResponseStandard(ReconciliationRunResponseDto, { isArray: true, description: 'Run history' })
    @ApiStandardErrors()
    async listRuns(@CurrentUser() user: RequestUser) {
        const runs = await this.runs.listRecent(user.tenantId, RECENT_RUNS);
        return ApiResponseBuilder.success(runs.map(toRunResponse), 'Reconciliation runs');
    }

    @Post('runs')
    @ApiOperation({
        summary: 'Run reconciliation now',
        description: 'Evaluates and stores a MANUAL run. newFindings lists drift that is new or grown since the previous run.',
    })
    @ApiCreatedResponseStandard(ReconciliationRunResponseDto, { description: 'Stored run' })
    @ApiStandardErrors()
    async run(@CurrentUser() user: RequestUser) {
        const run = await this.monitor.runForTenant(user.tenantId, 'MANUAL');
        return ApiResponseBuilder.success(run, 'Reconciliation run');
    }
}
