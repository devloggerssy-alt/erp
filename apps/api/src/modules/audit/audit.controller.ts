import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditLogResponseDto } from './dto/audit-log.dto';
import { JwtAuthGuard, PermissionsGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiOkResponsePaginated, ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @RequirePermission('auditLogs.view')
    @ApiOperation({ summary: 'List audit logs', description: 'Returns a paginated list of audit trail entries tracking all data changes (create, update, delete) across the system. Filter by entity type or specific entity ID.' })
    @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g., INVOICE, PAYMENT, ITEM)' })
    @ApiQuery({ name: 'entityId', required: false, description: 'Filter by specific entity ID' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponsePaginated(AuditLogResponseDto, { description: 'Paginated list of audit logs' })
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
