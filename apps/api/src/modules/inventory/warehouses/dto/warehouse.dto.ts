import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

export class CreateWarehouseDto {
    @ApiProperty({ example: 'WH-MAIN', description: 'Unique warehouse code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ type: LocalizedStringDto, description: 'Warehouse display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiPropertyOptional({ example: 'Damascus Industrial Zone' })
    @IsOptional()
    @IsString()
    address?: string;
}

export class UpdateWarehouseDto {
    @ApiPropertyOptional({ example: 'WH-MAIN' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ example: 'Damascus Industrial Zone, Building 5' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class WarehouseResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-c100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'WH-MAIN' })
    code: string = '';

    @ApiProperty({ example: 'Main Warehouse' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ example: 'Damascus Industrial Zone', nullable: true })
    address: string | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
