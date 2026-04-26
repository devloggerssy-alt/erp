import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFiscalPeriodDto {
    @ApiProperty({ example: '2026' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '2026-01-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2026-12-31' })
    @IsDateString()
    endDate: string;
}

export class UpdateFiscalPeriodDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ enum: ['OPEN', 'CLOSED', 'LOCKED'] })
    @IsOptional()
    @IsIn(['OPEN', 'CLOSED', 'LOCKED'])
    status?: 'OPEN' | 'CLOSED' | 'LOCKED';
}
