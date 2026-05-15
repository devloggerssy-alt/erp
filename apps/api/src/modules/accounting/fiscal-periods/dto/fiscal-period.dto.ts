import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFiscalPeriodDto {
    @ApiProperty({ example: '2026' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

    @ApiProperty({ example: '2026-01-01', description: 'Period start date (ISO 8601)' })
    @IsDateString()
    startDate: string = '';

    @ApiProperty({ example: '2026-12-31', description: 'Period end date (ISO 8601)' })
    @IsDateString()
    endDate: string = '';
}

export class UpdateFiscalPeriodDto {
    @ApiPropertyOptional({ example: '2026 – Extended' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ enum: ['OPEN', 'CLOSED', 'LOCKED'], example: 'OPEN' })
    @IsOptional()
    @IsIn(['OPEN', 'CLOSED', 'LOCKED'])
    status?: 'OPEN' | 'CLOSED' | 'LOCKED';
}

export class FiscalPeriodResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-b200-000000000001' })
    id: string = '';

    @ApiProperty({ example: '2026' })
    name: string = '';

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    startDate: string = '';

    @ApiProperty({ example: '2026-12-31T00:00:00.000Z' })
    endDate: string = '';

    @ApiProperty({ enum: ['OPEN', 'CLOSED', 'LOCKED'], example: 'OPEN' })
    status: string = 'OPEN';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
