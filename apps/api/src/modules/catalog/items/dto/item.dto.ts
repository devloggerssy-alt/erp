import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
    @ApiProperty({ example: 'ELEC-001', description: 'Unique item code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ example: 'Laptop 15"', description: 'Item display name' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

    @ApiPropertyOptional({ example: '6901234567890', description: 'Optional barcode / EAN' })
    @IsOptional()
    @IsString()
    barcode?: string;

    @ApiProperty({ example: '00000000-0000-4000-a700-000000000001', description: 'Category ID' })
    @IsString()
    @IsNotEmpty()
    categoryId: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a800-000000000001', description: 'Base unit ID' })
    @IsString()
    @IsNotEmpty()
    baseUnitId: string = '';

    @ApiPropertyOptional({ example: 750000, description: 'Default selling price' })
    @IsOptional()
    @IsNumber()
    defaultSellingPrice?: number;

    @ApiPropertyOptional({ example: 600000, description: 'Latest purchase price' })
    @IsOptional()
    @IsNumber()
    latestPurchasePrice?: number;
}

export class UpdateItemDto {
    @ApiPropertyOptional({ example: 'ELEC-001' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: 'Laptop 15" (Updated)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: '6901234567890' })
    @IsOptional()
    @IsString()
    barcode?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a700-000000000001' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a800-000000000001' })
    @IsOptional()
    @IsString()
    baseUnitId?: string;

    @ApiPropertyOptional({ example: 780000 })
    @IsOptional()
    @IsNumber()
    defaultSellingPrice?: number;

    @ApiPropertyOptional({ example: 620000 })
    @IsOptional()
    @IsNumber()
    latestPurchasePrice?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ItemResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'ELEC-001' })
    code: string = '';

    @ApiProperty({ example: 'Laptop 15"' })
    name: string = '';

    @ApiProperty({ example: '6901234567890', nullable: true })
    barcode: string | null = null;

    @ApiProperty({ example: '00000000-0000-4000-a700-000000000001' })
    categoryId: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a800-000000000001' })
    baseUnitId: string = '';

    @ApiProperty({ example: 750000, nullable: true })
    defaultSellingPrice: number | null = null;

    @ApiProperty({ example: 600000, nullable: true })
    latestPurchasePrice: number | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
