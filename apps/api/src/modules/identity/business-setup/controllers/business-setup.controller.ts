import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
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
    async getState(@CurrentUser() user: RequestUser): Promise<BusinessSetupStateResponseDto> {
        await this.syncTasksFromDiscovery(user.tenantId);
        return this.buildState(user.tenantId);
    }

    @Get('plan')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Preview the task graph for the tenant\'s saved (or default) profile — does not persist' })
    async getPlan(@CurrentUser() user: RequestUser): Promise<BusinessSetupPlanResponseDto> {
        const profile = await this.profileService.getProfile(user.tenantId);
        const inspection = await this.discoveryService.inspect(user.tenantId);
        const items = this.planService.generate(profile, inspection);
        return { tasks: items.map(({ type, required, dependencies }) => ({ type, required, dependencies })) };
    }

    @Post('profile')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Declare which modules this tenant uses and (re)generate the persisted setup-task plan' })
    async setProfile(@CurrentUser() user: RequestUser, @Body() dto: SetBusinessSetupProfileDto): Promise<BusinessSetupStateResponseDto> {
        await this.profileService.setProfile(user.tenantId, dto.modules);
        const inspection = await this.discoveryService.inspect(user.tenantId);
        const items = this.planService.generate(dto.modules, inspection);
        await this.taskService.upsertPlan(user.tenantId, items);
        return this.buildState(user.tenantId);
    }

    @Patch('tasks/:type')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Execute a READY setup task — body shape depends on the task type; see the spec\'s 6.3 handler table' })
    @ApiParam({ name: 'type', enum: SetupTaskType, enumName: 'SetupTaskType', description: 'Setup task type to execute' })
    @ApiBody({ description: 'Task-type-specific payload: an array for batch-create tasks, a single object for FISCAL_PERIOD/FINANCIAL_MAPPINGS, absent for CHART_OF_ACCOUNTS/RECONCILIATION', schema: { oneOf: [{ type: 'array' }, { type: 'object' }] } })
    async executeTask(
        @CurrentUser() user: RequestUser,
        @Param('type') type: string,
        @Body() body: unknown,
    ): Promise<SetupTaskResponseDto> {
        if (!SETUP_TASK_TYPES.includes(type as SetupTaskType)) {
            throw new BadRequestException(`Unknown setup task type "${type}"`);
        }
        const task = await this.orchestrator.execute(user.tenantId, user.id, type as SetupTaskType, body);
        return this.presenter.toResponse(task);
    }

    @Post('tasks/:type/skip')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Mark a setup task as not applicable (SKIPPED) — only skippable task types' })
    @ApiParam({ name: 'type', enum: SetupTaskType, enumName: 'SetupTaskType', description: 'Setup task type to skip' })
    async skipTask(@CurrentUser() user: RequestUser, @Param('type') type: string): Promise<SetupTaskResponseDto> {
        if (!SETUP_TASK_TYPES.includes(type as SetupTaskType)) {
            throw new BadRequestException(`Unknown setup task type "${type}"`);
        }
        const task = await this.taskService.skip(user.tenantId, type as SetupTaskType);
        await this.readinessService.refresh(user.tenantId);
        return this.presenter.toResponse(task);
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
