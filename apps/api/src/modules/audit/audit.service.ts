import { Injectable } from '@nestjs/common';
import { AuditLogPresenter } from './presenters/audit-log.presenter';
import { AuditLogRepository, type AuditLogFilters } from './repositories/audit-log.repository';

@Injectable()
export class AuditService {
    constructor(
        private readonly repository: AuditLogRepository,
        private readonly presenter: AuditLogPresenter,
    ) {}

    async findAll(tenantId: string, filters: AuditLogFilters & { page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const { entityType, entityId } = filters;
        const { rows, total } = await this.repository.findPage(tenantId, { entityType, entityId }, page, limit);
        return { data: this.presenter.toResponseList(rows), total, page, limit };
    }
}
