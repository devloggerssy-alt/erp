import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
    @ApiProperty({ example: 'ELEC-001', description: 'Unique item code' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Laptop 15"', description: 'Item display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: '6901234567890', description: 'Optional barcode / EAN' })
    @IsOptional()
    @IsString()
    barcode?: string;

    @ApiProperty({ example: '00000000-0000-4000-a700-000000000001', description: 'Category ID (Electronics)' })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ example: '00000000-0000-4000-a800-000000000001', description: 'Base unit ID (Piece)' })
    @IsString()
    @IsNotEmpty()
    baseUnitId: string;

    @ApiPropertyOptional({ example: 750000, description: 'Default selling price in SYP' })
    @IsOptional()
    @IsNumber()
    defaultSellingPrice?: number;

    @ApiPropertyOptional({ example: 600000, description: 'Latest purchase price in SYP' })
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

    @ApiPropertyOptional({ example: '00000000-0000-4000-a700-000000000001', description: 'Category ID' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a800-000000000001', description: 'Base unit ID' })
    @IsOptional()
    @IsString()
    baseUnitId?: string;

    @ApiPropertyOptional({ example: 780000, description: 'Updated selling price in SYP' })
    @IsOptional()
    @IsNumber()
    defaultSellingPrice?: number;

    @ApiPropertyOptional({ example: 620000, description: 'Updated purchase price in SYP' })
    @IsOptional()
    @IsNumber()
    latestPurchasePrice?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateItemStatusDto {
    @ApiProperty({ example: false, description: 'Set item active/inactive' })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
