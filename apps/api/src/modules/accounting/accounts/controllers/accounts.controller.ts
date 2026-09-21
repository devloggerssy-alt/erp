import { Controller, Get, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { createCrudController, type CrudOpenApi, RequirePermission } from '@devloggers/backend-core';
import { AccountsService } from '../services/accounts.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto, ChartOfAccountResponseDto, ChartOfAccountTreeDto } from '../dto';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, type RequestUser } from '@/modules/identity/auth/decorators';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '@/common/decorators/api-swagger.decorators';

// ── OpenAPI config ────────────────────────────────────────────────────────────

const ACCOUNTS_CRUD_OPENAPI = {
    list: {
        operation: {
            summary: 'List chart-of-accounts',
            description: 'Returns all accounts for the tenant, ordered by code. Includes the parent account name/code for hierarchical display.',
        },
        responseDescription: 'Chart-of-accounts list',
    },
    show: {
        operation: { summary: 'Get an account by ID', description: 'Returns account details including parent and direct children.' },
        responseDescription: 'Account details',
        idParam: { description: 'Account UUID' },
    },
    create: {
        operation: {
            summary: 'Create a chart-of-account entry',
            description: 'Account code must be unique within the tenant.',
        },
        responseDescription: 'Account created successfully',
    },
    update: {
        operation: {
            summary: 'Update a chart-of-account entry',
            description: 'Partial update — only provided fields are changed. Account code is immutable.',
        },
        responseDescription: 'Updated account',
        idParam: { description: 'Account UUID' },
    },
    delete: {
        operation: {
            summary: 'Delete a chart-of-account entry',
            description: 'Hard-deletes the account. Will fail if the account has journal lines referencing it.',
        },
        noContentDescription: 'Account deleted successfully',
        idParam: { description: 'Account UUID' },
    },
} satisfies CrudOpenApi;

// ── Base class from factory ───────────────────────────────────────────────────

const AccountsCrudBase = createCrudController({
    responseDto: ChartOfAccountResponseDto,
    createDto: CreateChartOfAccountDto,
    updateDto: UpdateChartOfAccountDto,
    filterSchema: [
        { field: 'code', type: 'string' },
        { field: 'name', type: 'string', localized: true },
        { field: 'isActive', type: 'boolean' },
    ],
    openApi: ACCOUNTS_CRUD_OPENAPI,
    permissions: {
      view: 'accounts.view',
      create: 'accounts.create',
      update: 'accounts.update',
      delete: 'accounts.delete',
    },
});

// ── Concrete controller ───────────────────────────────────────────────────────

@ApiTags('Accounting / Accounts')
@Controller('accounting/chart-of-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AccountsController extends AccountsCrudBase {
    constructor(private readonly accountsService: AccountsService) {
        super(accountsService, 'Account');
    }

    @Get('tree')
    @RequirePermission('accounts.view')
    @ApiOperation({
        summary: 'Get account tree structure',
        description: 'Lightweight account list for tree navigation. No balance computation.',
    })
    @ApiOkResponseStandard(ChartOfAccountTreeDto, { isArray: true, description: 'Account tree' })
    @ApiStandardErrors()
    async tree(@CurrentUser() user: RequestUser) {
        const data = await this.accountsService.getTree(user.tenantId);
        return ApiResponseBuilder.success(data, 'Account tree');
    }

    @Patch(':id/restore')
    @RequirePermission('accounts.update')
    @ApiOperation({
        summary: 'Restore an archived account',
        description: 'Nulls deletedAt. The account becomes visible again.',
    })
    @ApiStandardErrors()
    async restore(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        await this.accountsService.restore(user.tenantId, id);
        return ApiResponseBuilder.success(null, 'Account restored');
    }

    @Post(':id/convert-to-group')
    @RequirePermission('accounts.update')
    @ApiOperation({
        summary: 'Convert a leaf account to a group account',
        description: 'Sets isPostable=false. Fails if the account has journal entries.',
    })
    @ApiStandardErrors()
    async convertToGroup(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        await this.accountsService.convertToGroup(user.tenantId, id);
        return ApiResponseBuilder.success(null, 'Account converted to group');
    }
}
