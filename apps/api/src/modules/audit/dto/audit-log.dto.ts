import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true, description: 'Values before the change' })
    oldValues?: Record<string, unknown> | null;

    @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true, description: 'Values after the change' })
    newValues?: Record<string, unknown> | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '203.0.113.7' })
    ipAddress?: string | null;

    @ApiProperty({ type: 'string', example: 'HTTP', description: 'Origin of the audited write' })
    source!: string;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'Joins the row to its request log lines' })
    correlationId?: string | null;

    @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true, description: 'Free-form request context' })
    metadata?: Record<string, unknown> | null;

    @ApiProperty({ type: 'string', format: 'date-time', example: '2026-04-14T12:00:00.000Z' })
    createdAt!: string;
}
