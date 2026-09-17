import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SetupTaskResponseDto, SetupTaskPlanItemResponseDto } from './setup-task-response.dto';

export class BusinessSetupStateResponseDto {
    @ApiProperty({ type: () => SetupTaskResponseDto, isArray: true })
    @Type(() => SetupTaskResponseDto)
    tasks: SetupTaskResponseDto[] = [];

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    profile: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '2026-01-01T00:00:00.000Z' })
    businessSetupCompletedAt: string | null = null;
}

export class BusinessSetupPlanResponseDto {
    @ApiProperty({ type: () => SetupTaskPlanItemResponseDto, isArray: true })
    @Type(() => SetupTaskPlanItemResponseDto)
    tasks: SetupTaskPlanItemResponseDto[] = [];
}
