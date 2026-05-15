import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from '../dto';
import { createStandardCrudControllerBase, type StandardCrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '../../guards';

const ROLES_CRUD_OPENAPI = {
    list: {
        operation: { summary: 'List roles', description: 'Returns all roles for the authenticated tenant.' },
        responseDescription: 'Paginated list of roles',
    },
    show: {
        operation: { summary: 'Get a role by ID' },
        responseDescription: 'Role details',
        idParam: { description: 'Role UUID' },
    },
    create: {
        operation: { summary: 'Create a role', description: 'Creates a new role. Name must be unique within the tenant.' },
        responseDescription: 'Role created successfully',
    },
    update: {
        operation: { summary: 'Update a role', description: 'Partial update — only provided fields are changed.' },
        responseDescription: 'Updated role',
        idParam: { description: 'Role UUID' },
    },
    delete: {
        operation: { summary: 'Delete a role', description: 'Deletes the role. Will fail if the role is assigned to users.' },
        noContentDescription: 'Role deleted successfully',
        idParam: { description: 'Role UUID' },
    },
} satisfies StandardCrudOpenApi;

const RolesCrudBase = createStandardCrudControllerBase({
    responseDto: RoleResponseDto,
    createDto: CreateRoleDto,
    updateDto: UpdateRoleDto,
    openApi: ROLES_CRUD_OPENAPI,
});

@ApiTags('Auth / Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController extends RolesCrudBase {
    constructor(private readonly rolesService: RolesService) {
        super(rolesService, 'Role');
    }
}
