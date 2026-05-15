import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Accounting')
@Controller('accounting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AccountingController {
    constructor(private readonly accountingService: AccountingService) {}

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
