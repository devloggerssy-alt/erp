import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '../../../../common/decorators/api-swagger.decorators';
import { SettingsResponseDto, UpdateSettingsDto, FormDefaultsResponseDto } from '../dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get('defaults')
    @ApiOperation({
        summary: 'Get form auto-fill defaults',
        description: 'Returns the current open fiscal period, base currency, and first active cashbox for invoice form pre-population.',
    })
    @ApiOkResponseStandard(FormDefaultsResponseDto, { description: 'Computed defaults for form pre-population' })
    @ApiStandardErrors()
    async getDefaults(@CurrentUser() user: RequestUser) {
        const defaults = await this.settingsService.getDefaults(user.tenantId);
        return ApiResponseBuilder.success(defaults, 'Form defaults');
    }

    @Get()
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
