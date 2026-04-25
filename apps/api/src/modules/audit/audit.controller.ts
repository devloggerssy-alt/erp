import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @ApiOperation({ summary: 'List audit logs', description: 'Returns a paginated list of audit trail entries tracking all data changes (create, update, delete) across the system. Filter by entity type or specific entity ID.' })
    @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g., INVOICE, PAYMENT, ITEM)' })
    @ApiQuery({ name: 'entityId', required: false, description: 'Filter by specific entity ID' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({
        description: 'Paginated list of audit logs',
        schema: {
            example: {
                message: 'Audit logs',
                data: [
                    {
                        id: '...',
                        entityType: 'INVOICE',
                        entityId: '00000000-0000-4000-ae00-000000000001',
                        action: 'UPDATE',
                        changes: { status: { from: 'DRAFT', to: 'POSTED' } },
                        userId: '00000000-0000-4000-a100-000000000001',
                        createdAt: '2026-04-14T12:00:00.000Z',
                    },
                ],
                meta: { pagination: { total: 100, page: 1, limit: 50, totalPages: 2 } },
            },
        },
    })
    @ApiStandardErrors()
    async findAll(
        @CurrentUser() user: RequestUser,
        @Query('entityType') entityType?: string,
        @Query('entityId') entityId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const result = await this.auditService.findAll(user.tenantId, {
            entityType,
            entityId,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });
        return ApiResponseBuilder.success(result.data, 'Audit logs', {
            pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) },
        });
    }
}
