import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
    @ApiProperty({ example: 'SYP', description: 'ISO 4217 currency code' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Syrian Pound' })
    @IsString()
    @IsNotEmpty()
    name: string;

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
