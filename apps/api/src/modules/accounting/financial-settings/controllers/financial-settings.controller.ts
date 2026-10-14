import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@/modules/identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '@/common/decorators/api-swagger.decorators';
import { FinancialSettingsService } from '../services/financial-settings.service';
import { FinancialSettingPresenter } from '../presenters/financial-setting.presenter';
import { FinancialSettingResponseDto, UpsertFinancialSettingBodyDto } from '../dto';

@ApiTags('Settings / Financial')
@Controller('settings/financial')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class FinancialSettingsController {
    constructor(
        private readonly service: FinancialSettingsService,
        private readonly presenter: FinancialSettingPresenter,
    ) { }

    @Get()
    @RequirePermission('financialSettings.manage')
    @ApiOperation({ summary: 'Get financial GL account settings' })
    @ApiOkResponseStandard(FinancialSettingResponseDto, { description: 'Financial settings or null' })
    @ApiStandardErrors()
    async get(@CurrentUser() user: RequestUser) {
        const setting = await this.service.findByTenantId(user.tenantId);
        return ApiResponseBuilder.success(
            setting ? this.presenter.toResponse(setting) : null,
            'Financial settings',
        );
    }

    @Patch()
    @RequirePermission('financialSettings.manage')
    @ApiOperation({ summary: 'Save (upsert) financial GL account settings' })
    @ApiOkResponseStandard(FinancialSettingResponseDto, { description: 'Updated financial settings' })
    @ApiStandardErrors()
    async upsert(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpsertFinancialSettingBodyDto,
    ) {
        const setting = await this.service.upsert(user.tenantId, dto);
        return ApiResponseBuilder.success(this.presenter.toResponse(setting), 'Financial settings updated');
    }
}
