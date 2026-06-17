import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@/modules/identity/auth/decorators';
import { FinancialSettingsService } from '../services/financial-settings.service';

export class UpsertFinancialSettingBodyDto {
    @ApiPropertyOptional({ example: '00000000-0000-4000-a600-000000000001', description: 'Default sales revenue account' })
    @IsOptional() @IsString()
    defaultSalesAccountId?: string | null;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a600-000000000002', description: 'Default purchase/COGS account' })
    @IsOptional() @IsString()
    defaultPurchaseAccountId?: string | null;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a600-000000000003', description: 'Default tax/VAT payable account' })
    @IsOptional() @IsString()
    defaultTaxAccountId?: string | null;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a600-000000000004', description: 'Default accounts receivable (AR) account' })
    @IsOptional() @IsString()
    defaultReceivableAccountId?: string | null;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a600-000000000005', description: 'Default accounts payable (AP) account' })
    @IsOptional() @IsString()
    defaultPayableAccountId?: string | null;
}

@ApiTags('Settings / Financial')
@Controller('settings/financial')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FinancialSettingsController {
    constructor(private readonly service: FinancialSettingsService) {}

    @Get()
    @ApiOperation({ summary: 'Get financial GL account settings' })
    @ApiOkResponse({ description: 'Financial settings or null' })
    async get(@CurrentUser() user: RequestUser) {
        return this.service.findByTenantId(user.tenantId);
    }

    @Patch()
    @ApiOperation({ summary: 'Save (upsert) financial GL account settings' })
    @ApiOkResponse({ description: 'Updated financial settings' })
    async upsert(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpsertFinancialSettingBodyDto,
    ) {
        return this.service.upsert(user.tenantId, dto);
    }
}
