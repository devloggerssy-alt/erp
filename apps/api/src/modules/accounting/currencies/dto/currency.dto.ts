import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

export class CreateCurrencyDto {
    @ApiProperty({ example: 'SYP', description: 'ISO 4217 currency code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiPropertyOptional({ type: LocalizedStringDto, description: 'Currency symbol for display' })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    symbol?: LocalizedStringDto;

    @ApiPropertyOptional({ example: true, description: 'Whether this is the base (local) currency' })
    @IsOptional()
    @IsBoolean()
    isBase?: boolean;
}

export class UpdateCurrencyDto {
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    symbol?: LocalizedStringDto;

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

    @ApiProperty({ example: 'الليرة السورية' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ example: '£', nullable: true })
    symbol: string | null = null;

    @ApiPropertyOptional({ type: LocalizedStringDto, nullable: true })
    symbolI18n: LocalizedStringDto | null = null;

    @ApiProperty({ example: true })
    isBase: boolean = false;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
