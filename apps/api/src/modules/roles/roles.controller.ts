import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    @ApiOperation({ summary: 'List all roles' })
    @ApiOkResponse({
        description: 'Roles list retrieved',
        schema: {
            example: {
                message: 'Roles list',
                data: [
                    { id: '00000000-0000-4000-a200-000000000001', name: 'Admin', permissions: ['*'] },
                    { id: '00000000-0000-4000-a200-000000000002', name: 'Cashier', permissions: ['invoices:read', 'payments:write'] },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const roles = await this.rolesService.findAll(user.tenantId);
        return ApiResponseBuilder.success(roles, 'Roles list');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new role' })
    @ApiCreatedResponse({
        description: 'Role created',
        schema: {
            example: {
                message: 'Role created',
                data: { id: '00000000-0000-4000-a200-000000000003', name: 'Warehouse Manager', permissions: ['inventory:*'] },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateRoleDto) {
        const role = await this.rolesService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(role, 'Role created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a role' })
    @ApiOkResponse({
        description: 'Role updated',
        schema: {
            example: {
                message: 'Role updated',
                data: { id: '00000000-0000-4000-a200-000000000002', name: 'Senior Cashier', permissions: ['invoices:*', 'payments:*'] },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        const role = await this.rolesService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(role, 'Role updated');
    }
}
