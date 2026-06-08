import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get tenant settings',
        description: 'Returns tenant-wide preferences grouped by category, with registry defaults filling unset keys.',
    })
    @ApiOkResponse({
        description: 'Tenant settings',
        schema: {
            example: {
                message: 'Tenant settings',
                data: {
                    localization: { timezone: 'UTC', locale: 'en', dateFormat: 'YYYY-MM-DD', numberFormat: '1,234.56', firstDayOfWeek: 1 },
                    financial: { defaultTaxRate: 0, roundingPrecision: 2, fiscalYearStartMonth: 1 },
                    documents: { invoiceDefaultNotes: '', invoiceDefaultTerms: '', documentFooter: '', showLogoOnDocuments: true },
                },
            },
        },
    })
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
    @ApiBody({
        schema: { type: 'object', additionalProperties: true, example: { defaultTaxRate: 15, timezone: 'Europe/Istanbul' } },
        description: 'Partial map of registry keys to new values',
    })
    @ApiOkResponse({ description: 'Updated tenant settings' })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Body() body: Record<string, unknown>,
    ) {
        const safeBody = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
        const settings = await this.settingsService.update(user.tenantId, safeBody);
        return ApiResponseBuilder.success(settings, 'Tenant settings updated');
    }
}
