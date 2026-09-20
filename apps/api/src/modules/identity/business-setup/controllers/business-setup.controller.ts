import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { SETUP_TASK_TYPES, DISCOVERY_ONLY_TASK_TYPES } from '../constants/setup-task-graph';
import { BusinessSetupDiscoveryService } from '../services/business-setup-discovery.service';
import { BusinessSetupPlanService } from '../services/business-setup-plan.service';
import { BusinessSetupTaskService } from '../services/business-setup-task.service';
import { BusinessSetupProfileService } from '../services/business-setup-profile.service';
import { BusinessSetupOrchestratorService } from '../services/business-setup-orchestrator.service';
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
        private readonly presenter: SetupTaskPresenter,
    ) {}

    @Get('state')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Current persisted setup-task state, with discovery-only tasks re-derived from existing data' })
    async getState(@CurrentUser() user: RequestUser): Promise<BusinessSetupStateResponseDto> {
        await this.autoCompleteDiscoveryOnlyTasks(user.tenantId);
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
        return this.presenter.toResponse(task);
    }

    private async autoCompleteDiscoveryOnlyTasks(tenantId: string): Promise<void> {
        const inspection = await this.discoveryService.inspect(tenantId);
        const inspectionKeyByType: Partial<Record<SetupTaskType, keyof typeof inspection>> = {
            WAREHOUSES: 'warehouses', PRODUCTS: 'products', CUSTOMERS: 'customers',
            SUPPLIERS: 'suppliers', OPENING_INVENTORY: 'openingInventory',
        };
        for (const type of DISCOVERY_ONLY_TASK_TYPES) {
            const task = await this.taskService.listForTenant(tenantId).then((tasks) => tasks.find((t) => t.type === type));
            if (!task || task.status === 'COMPLETED' || task.status === 'SKIPPED') continue;
            const key = inspectionKeyByType[type];
            if (key && inspection[key].classification === 'EXISTING') {
                await this.taskService.recordAttempt(tenantId, type, true, { discovery: inspection[key] });
            }
        }
    }

    private async buildState(tenantId: string): Promise<BusinessSetupStateResponseDto> {
        const [tasks, profile] = await Promise.all([
            this.taskService.listForTenant(tenantId),
            this.profileService.getProfile(tenantId),
        ]);
        return {
            tasks: this.presenter.toResponseList(tasks),
            profile: profile as unknown as Record<string, unknown>,
            businessSetupCompletedAt: null,
        };
    }
}
