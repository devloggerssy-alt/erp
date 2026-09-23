import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';
import { SettingsResponseDto, UpdateSettingsDto } from '../dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @RequirePermission('settings.manage')
    @ApiOperation({
        summary: 'Get tenant settings',
        description: 'Returns tenant-wide preferences grouped by category, with registry defaults filling unset keys.',
    })
    @ApiOkResponse({ description: 'Tenant settings', type: SettingsResponseDto })
    @ApiStandardErrors()
    async getAll(@CurrentUser() user: RequestUser) {
        const settings = await this.settingsService.getAll(user.tenantId);
        return ApiResponseBuilder.success(settings, 'Tenant settings');
    }

    @Patch()
    @RequirePermission('settings.manage')
    @ApiOperation({
        summary: 'Update tenant settings',
        description: 'Partial update of preference keys. Each key is validated against the settings registry; invalid keys return 422.',
    })
    @ApiBody({ type: UpdateSettingsDto })
    @ApiOkResponse({ description: 'Updated tenant settings', type: SettingsResponseDto })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Body() body: Record<string, unknown>,
    ) {
        const settings = await this.settingsService.update(user.tenantId, body);
        return ApiResponseBuilder.success(settings, 'Tenant settings updated');
    }
}
