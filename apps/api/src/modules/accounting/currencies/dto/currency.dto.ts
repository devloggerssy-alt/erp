import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
    @ApiProperty({ example: 'SYP', description: 'ISO 4217 currency code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ example: 'Syrian Pound' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

    @ApiPropertyOptional({ example: '£', description: 'Currency symbol for display' })
    @IsOptional()
    @IsString()
    symbol?: string;

    @ApiPropertyOptional({ example: true, description: 'Whether this is the base (local) currency' })
    @IsOptional()
    @IsBoolean()
    isBase?: boolean;
}

export class UpdateCurrencyDto {
    @ApiPropertyOptional({ example: 'Syrian Pound (Updated)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'ل.س' })
    @IsOptional()
    @IsString()
    symbol?: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isBase?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class CurrencyResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-b100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'SYP' })
    code: string = '';

    @ApiProperty({ example: 'Syrian Pound' })
    name: string = '';

    @ApiProperty({ example: '£', nullable: true })
    symbol: string | null = null;

    @ApiProperty({ example: true })
    isBase: boolean = false;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
