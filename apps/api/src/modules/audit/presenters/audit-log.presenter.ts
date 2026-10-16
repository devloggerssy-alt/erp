import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { AuditLog } from '@devloggers/db-prisma';
import { AuditLogResponseDto } from '../dto/audit-log.dto';

@Injectable()
export class AuditLogPresenter extends CrudPresenter<AuditLog, AuditLogResponseDto> {
    toResponse(entity: AuditLog): AuditLogResponseDto {
        return {
            id: entity.id,
            tenantId: entity.tenantId,
            userId: entity.userId,
            action: entity.action,
            entityType: entity.entityType,
            entityId: entity.entityId,
            oldValues: entity.oldValues,
            newValues: entity.newValues,
            ipAddress: entity.ipAddress,
            source: entity.source,
            correlationId: entity.correlationId,
            metadata: entity.metadata,
            createdAt: entity.createdAt.toISOString(),
        };
    }
}
