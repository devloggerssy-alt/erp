import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';
import { SETUP_TASK_TYPES } from '../constants/setup-task-graph';
import { inspectionAreaFor, isDiscoverablyComplete } from '../constants/discovery-completion';
import { BusinessSetupDiscoveryService } from '../services/business-setup-discovery.service';
import { BusinessSetupPlanService } from '../services/business-setup-plan.service';
import { BusinessSetupTaskService } from '../services/business-setup-task.service';
import { BusinessSetupProfileService } from '../services/business-setup-profile.service';
import { BusinessSetupOrchestratorService } from '../services/business-setup-orchestrator.service';
import { BusinessSetupReadinessService } from '../services/business-setup-readiness.service';
import { BusinessSetupTenantRepository } from '../repositories/business-setup-tenant.repository';
import { selectNextAction } from '../utils/next-action.util';
import { SetupTaskPresenter } from '../presenters/setup-task.presenter';
import {
    BusinessSetupStateResponseDto,
    BusinessSetupPlanResponseDto,
    SetBusinessSetupProfileDto,
    SetupTaskResponseDto,
} from '../dto';

@ApiTags('Identity / Business Setup')
@Controller('business-setup')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class BusinessSetupController {
    constructor(
        private readonly discoveryService: BusinessSetupDiscoveryService,
        private readonly planService: BusinessSetupPlanService,
        private readonly taskService: BusinessSetupTaskService,
        private readonly profileService: BusinessSetupProfileService,
        private readonly orchestrator: BusinessSetupOrchestratorService,
        private readonly readinessService: BusinessSetupReadinessService,
        private readonly tenantRepository: BusinessSetupTenantRepository,
        private readonly presenter: SetupTaskPresenter,
    ) {}

    @Get('state')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Current persisted setup-task state, with discovery-only tasks re-derived from existing data' })
    @ApiOkResponseStandard(BusinessSetupStateResponseDto, { description: 'Current business setup state' })
    @ApiStandardErrors()
    async getState(@CurrentUser() user: RequestUser) {
        await this.syncTasksFromDiscovery(user.tenantId);
        return ApiResponseBuilder.success(await this.buildState(user.tenantId), 'Business setup state');
    }

    @Get('plan')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Preview the task graph for the tenant\'s saved (or default) profile — does not persist' })
    @ApiOkResponseStandard(BusinessSetupPlanResponseDto, { description: 'Previewed business setup plan' })
    @ApiStandardErrors()
    async getPlan(@CurrentUser() user: RequestUser) {
        const profile = await this.profileService.getProfile(user.tenantId);
        const inspection = await this.discoveryService.inspect(user.tenantId);
        const items = this.planService.generate(profile, inspection);
        return ApiResponseBuilder.success(
            { tasks: items.map(({ type, required, dependencies }) => ({ type, required, dependencies })) },
            'Business setup plan',
        );
    }

    @Post('profile')
    @RequirePermission('businessSetup.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Declare which modules this tenant uses and (re)generate the persisted setup-task plan' })
    @ApiOkResponseStandard(BusinessSetupStateResponseDto, { description: 'Business setup state after saving the profile' })
    @ApiStandardErrors()
    async setProfile(@CurrentUser() user: RequestUser, @Body() dto: SetBusinessSetupProfileDto) {
        await this.profileService.setProfile(user.tenantId, dto.modules);
        const inspection = await this.discoveryService.inspect(user.tenantId);
        const items = this.planService.generate(dto.modules, inspection);
        await this.taskService.upsertPlan(user.tenantId, items);
        return ApiResponseBuilder.success(await this.buildState(user.tenantId), 'Business setup profile saved');
    }

    @Patch('tasks/:type')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Execute a READY setup task — body shape depends on the task type; see the spec\'s 6.3 handler table' })
    @ApiParam({ name: 'type', enum: SetupTaskType, enumName: 'SetupTaskType', description: 'Setup task type to execute' })
    @ApiBody({ description: 'Task-type-specific payload: an array for batch-create tasks, a single object for FISCAL_PERIOD/FINANCIAL_MAPPINGS, absent for CHART_OF_ACCOUNTS/RECONCILIATION', schema: { oneOf: [{ type: 'array' }, { type: 'object' }] } })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponseStandard(SetupTaskResponseDto, { description: 'Executed setup task' })
    @ApiStandardErrors()
    async executeTask(
        @CurrentUser() user: RequestUser,
        @Param('type') type: string,
        @Body() body: unknown,
    ) {
        if (!SETUP_TASK_TYPES.includes(type as SetupTaskType)) {
            throw new BadRequestException(`Unknown setup task type "${type}"`);
        }
        const task = await this.orchestrator.execute(user.tenantId, user.id, type as SetupTaskType, body);
        return ApiResponseBuilder.success(this.presenter.toResponse(task), 'Setup task executed');
    }

    @Post('tasks/:type/skip')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Mark a setup task as not applicable (SKIPPED) — only skippable task types' })
    @ApiParam({ name: 'type', enum: SetupTaskType, enumName: 'SetupTaskType', description: 'Setup task type to skip' })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponseStandard(SetupTaskResponseDto, { description: 'Skipped setup task' })
    @ApiStandardErrors()
    async skipTask(@CurrentUser() user: RequestUser, @Param('type') type: string) {
        if (!SETUP_TASK_TYPES.includes(type as SetupTaskType)) {
            throw new BadRequestException(`Unknown setup task type "${type}"`);
        }
        const task = await this.taskService.skip(user.tenantId, type as SetupTaskType);
        await this.readinessService.refresh(user.tenantId);
        return ApiResponseBuilder.success(this.presenter.toResponse(task), 'Setup task skipped');
    }

    private async syncTasksFromDiscovery(tenantId: string): Promise<void> {
        const [inspection, tasks] = await Promise.all([
            this.discoveryService.inspect(tenantId),
            this.taskService.listForTenant(tenantId),
        ]);
        for (const task of tasks) {
            if (task.status === 'COMPLETED' || task.status === 'SKIPPED') continue;
            if (!isDiscoverablyComplete(task.type, inspection)) continue;
            await this.taskService.recordAttempt(tenantId, task.type, true, {
                discovery: inspectionAreaFor(task.type, inspection),
            });
        }
    }

    private async buildState(tenantId: string): Promise<BusinessSetupStateResponseDto> {
        const [tasks, profile, tenant] = await Promise.all([
            this.taskService.listForTenant(tenantId),
            this.profileService.getProfile(tenantId),
            this.tenantRepository.findSetupState(tenantId),
        ]);
        const readiness = await this.readinessService.refresh(tenantId, tasks);

        return {
            tasks: this.presenter.toResponseList(tasks),
            profile: profile as unknown as Record<string, unknown>,
            businessSetupCompletedAt: tenant?.businessSetupCompletedAt?.toISOString() ?? null,
            readiness,
            nextAction: selectNextAction(tasks),
        };
    }
}
