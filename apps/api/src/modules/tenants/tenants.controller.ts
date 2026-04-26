import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

    @Post()
    async create(@Body() dto: CreateTenantDto) {
        const tenant = await this.tenantsService.create(dto);
        return ApiResponseBuilder.success(tenant, 'Tenant created');
    }

    @Get('current')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    async getCurrent(@CurrentUser() user: RequestUser) {
        const tenant = await this.tenantsService.findCurrent(user.tenantId);
        return ApiResponseBuilder.success(tenant, 'Current tenant');
    }

    @Patch('current')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    async updateCurrent(
        @CurrentUser() user: RequestUser,
        @Body() dto: UpdateTenantDto,
    ) {
        const tenant = await this.tenantsService.updateCurrent(user.tenantId, dto);
        return ApiResponseBuilder.success(tenant, 'Tenant updated');
    }
}
