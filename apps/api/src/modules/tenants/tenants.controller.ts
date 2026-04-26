import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new tenant' })
    @ApiCreatedResponse({
        description: 'Tenant created successfully',
        schema: {
            example: {
                message: 'Tenant created',
                data: { id: '00000000-0000-4000-a000-000000000001', name: 'Demo Shop', slug: 'demo-shop', createdAt: '2026-01-01T00:00:00.000Z' },
            },
        },
    })
    @ApiStandardErrors()
    async create(@Body() dto: CreateTenantDto) {
        const tenant = await this.tenantsService.create(dto);
        return ApiResponseBuilder.success(tenant, 'Tenant created');
    }

    @Get('current')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current tenant', description: 'Returns the tenant profile associated with the authenticated user\'s JWT token.' })
    @ApiOkResponse({
        description: 'Current tenant returned',
        schema: {
            example: {
                message: 'Current tenant',
                data: { id: '00000000-0000-4000-a000-000000000001', name: 'Demo Shop', slug: 'demo-shop', baseCurrencyId: '00000000-0000-4000-a300-000000000001' },
            },
        },
    })
    @ApiStandardErrors()
    async getCurrent(@CurrentUser() user: RequestUser) {
        const tenant = await this.tenantsService.findCurrent(user.tenantId);
        return ApiResponseBuilder.success(tenant, 'Current tenant');
    }

    @Patch('current')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update current tenant' })
    @ApiOkResponse({
        description: 'Tenant updated successfully',
        schema: {
            example: {
                message: 'Tenant updated',
                data: { id: '00000000-0000-4000-a000-000000000001', name: 'Demo Shop Updated', slug: 'demo-shop' },
            },
        },
    })
    @ApiStandardErrors()
    async updateCurrent(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpdateTenantDto,
    ) {
        const tenant = await this.tenantsService.updateCurrent(user.tenantId, dto);
        return ApiResponseBuilder.success(tenant, 'Tenant updated');
    }
}
