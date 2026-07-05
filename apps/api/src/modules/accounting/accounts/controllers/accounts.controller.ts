import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { AccountsService } from '../services/accounts.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto, ChartOfAccountResponseDto, ChartOfAccountTreeDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
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
    openApi: ACCOUNTS_CRUD_OPENAPI,
});

// ── Concrete controller ───────────────────────────────────────────────────────

@ApiTags('Accounting / Accounts')
@Controller('accounting/chart-of-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AccountsController extends AccountsCrudBase {
    constructor(private readonly accountsService: AccountsService) {
        super(accountsService, 'Account');
    }

    @Get('tree')
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
}
