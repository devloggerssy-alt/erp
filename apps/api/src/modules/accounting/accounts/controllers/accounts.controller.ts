import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createStandardCrudControllerBase, type StandardCrudOpenApi } from '@devloggers/backend-core';
import { AccountsService } from '../services/accounts.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto, ChartOfAccountResponseDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

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
} satisfies StandardCrudOpenApi;

// ── Base class from factory ───────────────────────────────────────────────────

const AccountsCrudBase = createStandardCrudControllerBase({
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
}
