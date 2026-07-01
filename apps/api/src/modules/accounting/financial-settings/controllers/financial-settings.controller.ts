import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@/modules/identity/auth/decorators';
import { FinancialSettingsService } from '../services/financial-settings.service';
import { FinancialSettingResponseDto, UpsertFinancialSettingBodyDto } from '../financial-settings.dto';



@ApiTags('Settings / Financial')
@Controller('settings/financial')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FinancialSettingsController {
    constructor(private readonly service: FinancialSettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Get financial GL account settings' })
    @ApiOkResponse({ description: 'Financial settings or null', type: FinancialSettingResponseDto })
    async get(@CurrentUser() user: RequestUser) {
        return this.service.findByTenantId(user.tenantId);
    }

    @Patch()
    @ApiOperation({ summary: 'Save (upsert) financial GL account settings' })
    @ApiOkResponse({ description: 'Updated financial settings', type: FinancialSettingResponseDto })
    async upsert(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpsertFinancialSettingBodyDto,
    ) {
        return this.service.upsert(user.tenantId, dto);
    }
}
