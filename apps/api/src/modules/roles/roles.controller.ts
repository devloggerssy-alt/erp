import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    async findAll(@CurrentUser() user: RequestUser) {
        const roles = await this.rolesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(roles, 'Roles list');
    }

    @Post()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateRoleDto) {
        const role = await this.rolesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(role, 'Role created');
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        const role = await this.rolesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(role, 'Role updated');
    }
}
