import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Prisma } from '@devloggers/db-prisma';

/** Audited JSON payloads are whatever the request or caller wrote: object, array or scalar. */
const AUDIT_JSON_VALUE = {
    oneOf: [
        { type: 'object', additionalProperties: true },
        { type: 'array', items: {} },
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
    ],
};

export class AuditLogResponseDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a100-000000000001' })
    id!: string;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-ae00-000000000001' })
    tenantId!: string;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a100-000000000001' })
    userId!: string;

    @ApiProperty({ type: 'string', example: 'UPDATE', description: 'Audited action' })
    action!: string;

    @ApiProperty({ type: 'string', example: 'INVOICE', description: 'Audited entity type' })
    entityType!: string;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-ae00-000000000001', description: 'Audited entity ID' })
    entityId!: string;

    @ApiPropertyOptional({ ...AUDIT_JSON_VALUE, nullable: true, description: 'Values before the change' })
    oldValues?: Prisma.JsonValue | null;

    @ApiPropertyOptional({ ...AUDIT_JSON_VALUE, nullable: true, description: 'Values after the change' })
    newValues?: Prisma.JsonValue | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '203.0.113.7' })
    ipAddress?: string | null;

    @ApiProperty({ type: 'string', example: 'HTTP', description: 'Origin of the audited write' })
    source!: string;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'Joins the row to its request log lines' })
    correlationId?: string | null;

    @ApiPropertyOptional({ ...AUDIT_JSON_VALUE, nullable: true, description: 'Free-form request context' })
    metadata?: Prisma.JsonValue | null;

    @ApiProperty({ type: 'string', format: 'date-time', example: '2026-04-14T12:00:00.000Z' })
    createdAt!: string;
}
