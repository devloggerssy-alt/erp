import { ApiProperty } from '@nestjs/swagger';
import type { ReconciliationRun } from '@devloggers/db-prisma';

export type ReconciliationTrigger = 'SCHEDULED' | 'MANUAL' | 'BUSINESS_SETUP';

export class ReconciliationRunResponseDto {
    @ApiProperty({ type: 'string' })
    id: string = '';

    @ApiProperty({ enum: ['SCHEDULED', 'MANUAL', 'BUSINESS_SETUP'], enumName: 'ReconciliationTrigger' })
    trigger: ReconciliationTrigger = 'MANUAL';

    @ApiProperty({ type: 'boolean' })
    passed: boolean = true;

    @ApiProperty({ type: 'number' })
    findingCount: number = 0;

    @ApiProperty({ type: 'string', isArray: true, description: 'Finding fingerprints new or grown since the previous run' })
    newFindings: string[] = [];

    @ApiProperty({ type: 'string', nullable: true })
    correlationId: string | null = null;

    @ApiProperty({ type: 'string', example: '2026-09-17T03:00:01.000Z' })
    createdAt: string = '';
}

function toTrigger(value: string): ReconciliationTrigger {
    return value === 'SCHEDULED' || value === 'BUSINESS_SETUP' ? value : 'MANUAL';
}

export function toRunResponse(run: ReconciliationRun): ReconciliationRunResponseDto {
    const newFindings = Array.isArray(run.newFindings)
        ? run.newFindings.filter((f): f is string => typeof f === 'string')
        : [];
    return {
        id: run.id,
        trigger: toTrigger(run.trigger),
        passed: run.passed,
        findingCount: run.findingCount,
        newFindings,
        correlationId: run.correlationId,
        createdAt: run.createdAt.toISOString(),
    };
}
