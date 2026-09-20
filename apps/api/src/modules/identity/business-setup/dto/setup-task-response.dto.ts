import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SetupTaskType, SetupTaskStatus } from '@devloggers/db-prisma';

export class SetupTaskResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-e100-000000000001' })
    id: string = '';

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType' })
    type: SetupTaskType = SetupTaskType.CURRENCIES;

    @ApiProperty({ enum: SetupTaskStatus, enumName: 'SetupTaskStatus' })
    status: SetupTaskStatus = SetupTaskStatus.BLOCKED;

    @ApiProperty({ example: true })
    required: boolean = true;

    @ApiProperty({ example: true, description: 'True when the user may mark this task as not applicable (skippable type, not completed/skipped)' })
    skippable: boolean = false;

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    dependencies: SetupTaskType[] = [];

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    metadata: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    progress: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '2026-01-01T00:00:00.000Z' })
    completedAt: string | null = null;

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}

export class SetupTaskPlanItemResponseDto {
    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType' })
    type: SetupTaskType = SetupTaskType.CURRENCIES;

    @ApiProperty({ example: true })
    required: boolean = true;

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    dependencies: SetupTaskType[] = [];
}
