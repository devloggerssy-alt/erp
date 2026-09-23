import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '../../../../common/decorators/api-swagger.decorators';
import { FormDefaultsResponseDto } from '../dto/settings.dto';

/**
 * Form defaults are needed by every signed-in user to create records, so this
 * route is authenticated-only — deliberately NOT behind `settings.manage`.
 */
@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FormDefaultsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get('defaults')
    @ApiOperation({
        summary: 'Get form auto-fill defaults',
        description: 'Returns the current open fiscal period, base currency, first active cashbox, default (or first active) warehouse, default (or first active) unit, and the tenant\'s default AR/AP accounts for form pre-population.',
    })
    @ApiOkResponseStandard(FormDefaultsResponseDto, { description: 'Computed defaults for form pre-population' })
    @ApiStandardErrors()
    async getDefaults(@CurrentUser() user: RequestUser) {
        const defaults = await this.settingsService.getDefaults(user.tenantId);
        return ApiResponseBuilder.success(defaults, 'Form defaults');
    }
}
