import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, CreateTenantResponseDto, TenantResponseDto, UpdateTenantDto } from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import { ApiCreatedResponseStandard, ApiOkResponseStandard, ApiStandardErrors } from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new tenant' })
    @ApiCreatedResponseStandard(CreateTenantResponseDto, { description: 'Tenant created successfully' })
    @ApiStandardErrors()
    async create(@Body() dto: CreateTenantDto) {
        const tenant = await this.tenantsService.create(dto);
        return ApiResponseBuilder.success(tenant, 'Tenant created');
    }

    @Get('current')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current tenant', description: 'Returns the tenant profile associated with the authenticated user\'s JWT token.' })
    @ApiOkResponseStandard(TenantResponseDto, { description: 'Current tenant returned' })
    @ApiStandardErrors()
    async getCurrent(@CurrentUser() user: RequestUser) {
        const tenant = await this.tenantsService.findCurrent(user.tenantId);
        return ApiResponseBuilder.success(tenant, 'Current tenant');
    }

    @Patch('current')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update current tenant' })
    @ApiOkResponseStandard(TenantResponseDto, { description: 'Tenant updated successfully' })
    @ApiStandardErrors()
    async updateCurrent(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpdateTenantDto,
    ) {
        const tenant = await this.tenantsService.updateCurrent(user.tenantId, dto);
        return ApiResponseBuilder.success(tenant, 'Tenant updated');
    }
}
