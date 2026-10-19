import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
    createCrudController,
    type CrudOpenApi,
    type FilterSchema,
} from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto, UpdateBranchDto, BranchResponseDto } from '../dto';

const BRANCHES_CRUD_OPENAPI = {
    list: {
        operation: {
            summary: 'List branches',
            description:
                'Returns a paginated, filterable list of business locations belonging to the authenticated tenant.',
        },
        responseDescription: 'Paginated list of branches',
    },
    show: {
        operation: { summary: 'Get a branch by ID' },
        responseDescription: 'Branch details including its linked warehouses',
        idParam: { description: 'Branch UUID' },
    },
    create: {
        operation: {
            summary: 'Create a branch',
            description:
                'Creates a business location. The code is minted automatically when left blank and must be unique within the tenant.',
        },
        responseDescription: 'Branch created successfully',
    },
    update: {
        operation: {
            summary: 'Update a branch',
            description:
                'Partial update — only provided fields are changed. Removing the last branch from a warehouse is refused.',
        },
        responseDescription: 'Updated branch',
        idParam: { description: 'Branch UUID' },
    },
    delete: {
        operation: {
            summary: 'Delete a branch',
            description:
                'Hard-deletes a branch with no references. Warehouses, cashboxes or documents that refer to it refuse the delete — deactivate instead.',
        },
        noContentDescription: 'Branch deleted successfully',
        idParam: { description: 'Branch UUID' },
    },
} satisfies CrudOpenApi;

export const BRANCHES_FILTER_SCHEMA: FilterSchema = [
    { field: 'code', type: 'string' },
    { field: 'name', type: 'string', localized: true },
    { field: 'address', type: 'string' },
    { field: 'phone', type: 'string' },
    { field: 'email', type: 'string' },
    { field: 'isActive', type: 'boolean' },
];

const BranchesCrudBase = createCrudController({
    responseDto: BranchResponseDto,
    createDto: CreateBranchDto,
    updateDto: UpdateBranchDto,
    filterSchema: BRANCHES_FILTER_SCHEMA,
    openApi: BRANCHES_CRUD_OPENAPI,
    permissions: {
        view: 'branches.view',
        create: 'branches.create',
        update: 'branches.update',
        delete: 'branches.delete',
    },
});

@ApiTags('Platform / Branches')
@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class BranchesController extends BranchesCrudBase {
    constructor(private readonly branchesService: BranchesService) {
        super(branchesService, 'Branch');
    }
}
