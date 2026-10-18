import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JournalEntriesService } from '../services/journal-entries.service';
import { JournalEntryResponseDto } from '../dto/journal-entry-response.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard, ApiOkResponsePaginated } from '../../../../common/decorators/api-swagger.decorators';

@ApiTags('Accounting / Journal Entries')
@Controller('accounting/journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class JournalEntriesController {
    constructor(private readonly journalEntriesService: JournalEntriesService) {}

    @Get()
    @RequirePermission('journals.view')
    @ApiOperation({ summary: 'List all journal entries', description: 'Returns a paginated list of journal entries. Journal entries are automatically created when invoices or payments are posted/cancelled.' })
    @ApiOkResponsePaginated(JournalEntryResponseDto, { description: 'Paginated list of journal entries' })
    @ApiStandardErrors()
    async findJournalEntries(@CurrentUser() user: RequestUser, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.journalEntriesService.findJournalEntries(user.tenantId, page ? Number(page) : 1, limit ? Number(limit) : 50);
        return ApiResponseBuilder.success(result.data, 'Journal entries', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get(':id')
    @RequirePermission('journals.view')
    @ApiOperation({ summary: 'Get journal entry by ID' })
    @ApiOkResponseStandard(JournalEntryResponseDto, { description: 'Journal entry details with lines' })
    @ApiStandardErrors()
    async findJournalEntry(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.journalEntriesService.findJournalEntryById(user.tenantId, id), 'Journal entry details');
    }
}
