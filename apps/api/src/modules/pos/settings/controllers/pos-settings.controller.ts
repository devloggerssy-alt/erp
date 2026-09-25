import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequirePermission, type RequestUser } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '../../../identity/auth/guards';
import { CurrentUser } from '../../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';
import { PosSettingsService } from '../services/pos-settings.service';
import { PosSettingPresenter } from '../presenters/pos-setting.presenter';
import { UpdatePosSettingDto, PosSettingResponseDto } from '../dto';

@ApiTags('POS / Settings')
@Controller('pos/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PosSettingsController {
    constructor(
        private readonly service: PosSettingsService,
        private readonly presenter: PosSettingPresenter,
    ) {}

    @Get()
    @RequirePermission('pos.checkout')
    @ApiOperation({ summary: 'Get POS settings', description: 'Returns the tenant POS configuration, or null if not yet provisioned.' })
    @ApiOkResponseStandard(PosSettingResponseDto, { description: 'POS settings or null' })
    @ApiStandardErrors()
    async get(@CurrentUser() user: RequestUser) {
        const setting = await this.service.get(user.tenantId);
        return ApiResponseBuilder.success(setting ? this.presenter.toResponse(setting) : null, 'POS settings');
    }

    @Patch()
    @RequirePermission('pos.manage')
    @ApiOperation({ summary: 'Update POS settings', description: 'Change the till cashbox or issuing warehouse.' })
    @ApiOkResponseStandard(PosSettingResponseDto, { description: 'Updated POS settings' })
    @ApiStandardErrors()
    async update(@CurrentUser() user: RequestUser, @Body() dto: UpdatePosSettingDto) {
        const setting = await this.service.update(user.tenantId, dto);
        return ApiResponseBuilder.success(this.presenter.toResponse(setting), 'POS settings updated');
    }

    @Post('provision')
    @RequirePermission('pos.manage')
    @ApiOperation({ summary: 'Provision POS', description: 'Idempotently creates the walk-in customer, POS invoice type, and default till/warehouse.' })
    @ApiOkResponseStandard(PosSettingResponseDto, { description: 'POS settings' })
    @ApiStandardErrors()
    async provision(@CurrentUser() user: RequestUser) {
        const setting = await this.service.provision(user.tenantId);
        return ApiResponseBuilder.success(this.presenter.toResponse(setting), 'POS provisioned');
    }
}
