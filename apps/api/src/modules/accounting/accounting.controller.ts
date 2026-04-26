import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto/accounting.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Accounting')
@Controller('accounting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AccountingController {
    constructor(private readonly accountingService: AccountingService) {}

    @Get('chart-of-accounts')
    @ApiOperation({ summary: 'List all chart-of-account entries' })
    @ApiOkResponse({
        description: 'Chart of accounts list retrieved',
        schema: {
            example: {
                message: 'Chart of accounts',
                data: [
                    { id: '00000000-0000-4000-a601-000000000001', code: '1000', name: 'Current Assets', type: 'ASSET', parentId: null },
                    { id: '00000000-0000-4000-a601-000000000002', code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET', parentId: '00000000-0000-4000-a601-000000000001' },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAllAccounts(@CurrentUser() user: RequestUser) {
        return ApiResponseBuilder.success(await this.accountingService.findAllAccounts(user.tenantId), 'Chart of accounts');
    }

    @Get('chart-of-accounts/:id')
    @ApiOperation({ summary: 'Get account by ID' })
    @ApiOkResponse({
        description: 'Account details returned',
        schema: {
            example: {
                message: 'Account details',
                data: { id: '00000000-0000-4000-a601-000000000001', code: '1000', name: 'Current Assets', type: 'ASSET' },
            },
        },
    })
    @ApiStandardErrors()
    async findAccount(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.accountingService.findAccountById(user.tenantId, id), 'Account details');
    }

    @Post('chart-of-accounts')
    @ApiOperation({ summary: 'Create a new chart-of-account entry' })
    @ApiCreatedResponse({
        description: 'Account created',
        schema: {
            example: {
                message: 'Account created',
                data: { id: '...', code: '1120', name: 'Bank Accounts', type: 'ASSET' },
            },
        },
    })
    @ApiStandardErrors()
    async createAccount(@CurrentUser() user: RequestUser, @Body() dto: CreateChartOfAccountDto) {
        return ApiResponseBuilder.success(await this.accountingService.createAccount(user.tenantId, dto), 'Account created');
    }

    @Patch('chart-of-accounts/:id')
    @ApiOperation({ summary: 'Update a chart-of-account entry' })
    @ApiOkResponse({
        description: 'Account updated',
        schema: {
            example: {
                message: 'Account updated',
                data: { id: '00000000-0000-4000-a601-000000000001', name: 'Current Assets (Updated)' },
            },
        },
    })
    @ApiStandardErrors()
    async updateAccount(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateChartOfAccountDto) {
        return ApiResponseBuilder.success(await this.accountingService.updateAccount(user.tenantId, id, dto), 'Account updated');
    }

    @Get('journal-entries')
    @ApiOperation({ summary: 'List all journal entries', description: 'Returns a paginated list of journal entries. Journal entries are automatically created when invoices or payments are posted/cancelled.' })
    @ApiOkResponse({
        description: 'Paginated list of journal entries',
        schema: {
            example: {
                message: 'Journal entries',
                data: [
                    { id: '...', referenceType: 'INVOICE', referenceId: '...', date: '2026-04-14', lines: [{ accountId: '...', debit: 600000, credit: 0 }] },
                ],
                meta: { pagination: { total: 10, page: 1, limit: 50, totalPages: 1 } },
            },
        },
    })
    @ApiStandardErrors()
    async findJournalEntries(@CurrentUser() user: RequestUser, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.accountingService.findJournalEntries(user.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 50);
        return ApiResponseBuilder.success(result.data, 'Journal entries', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get('journal-entries/:id')
    @ApiOperation({ summary: 'Get journal entry by ID' })
    @ApiOkResponse({
        description: 'Journal entry details with lines',
        schema: {
            example: {
                message: 'Journal entry details',
                data: {
                    id: '...', referenceType: 'INVOICE', referenceId: '...', date: '2026-04-14',
                    lines: [
                        { accountId: '...', accountName: 'Inventory', debit: 600000, credit: 0 },
                        { accountId: '...', accountName: 'Accounts Payable', debit: 0, credit: 600000 },
                    ],
                },
            },
        },
    })
    @ApiStandardErrors()
    async findJournalEntry(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.accountingService.findJournalEntryById(user.tenantId, id), 'Journal entry details');
    }
}
