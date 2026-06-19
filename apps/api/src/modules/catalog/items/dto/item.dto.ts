import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsObject, IsIn, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CustomFieldValuesMap, ItemType } from '@devloggers/api-contracts';

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

    @ApiPropertyOptional({ example: '00000000-0000-4000-b000-000000000001', description: 'Brand ID', nullable: true })
    @IsOptional()
    @IsString()
    brandId?: string | null;

    @ApiPropertyOptional({ example: 750000, description: 'Default selling price' })
    @IsOptional()
    @IsNumber()
    defaultSellingPrice?: number;

    @ApiPropertyOptional({ example: 600000, description: 'Latest purchase price' })
    @IsOptional()
    @IsNumber()
    latestPurchasePrice?: number;

    @ApiPropertyOptional({ example: 'product', description: 'Item type', enum: ['product', 'service', 'vehicle', 'bundle'] })
    @IsOptional()
    @IsIn(['product', 'service', 'vehicle', 'bundle'])
    itemType?: ItemType;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/item-main.png', description: 'Main product image URL', nullable: true })
    @IsOptional()
    @IsUrl()
    mainImageUrl?: string | null;

    @ApiPropertyOptional({ type: [String], example: ['https://cdn.example.com/item-1.png'], description: 'Gallery image URLs' })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    galleryUrls?: string[];

    @ApiPropertyOptional({
        description: 'Custom field values keyed by field ID',
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    customFields?: CustomFieldValuesMap;
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

    @ApiPropertyOptional({ example: '00000000-0000-4000-b000-000000000001', nullable: true })
    @IsOptional()
    @IsString()
    brandId?: string | null;

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

    @ApiPropertyOptional({ example: 'product', enum: ['product', 'service', 'vehicle', 'bundle'] })
    @IsOptional()
    @IsIn(['product', 'service', 'vehicle', 'bundle'])
    itemType?: ItemType;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/item-main.png', nullable: true })
    @IsOptional()
    @IsUrl()
    mainImageUrl?: string | null;

    @ApiPropertyOptional({ type: [String], example: ['https://cdn.example.com/item-1.png'] })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    galleryUrls?: string[];

    @ApiPropertyOptional({
        description: 'Custom field values keyed by field ID',
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    customFields?: CustomFieldValuesMap;
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

    @ApiPropertyOptional({ example: '00000000-0000-4000-b000-000000000001', nullable: true })
    brandId: string | null = null;

    @ApiPropertyOptional({ description: 'Populated in show responses only' })
    category?: { id: string; name: string } | null;

    @ApiPropertyOptional({ description: 'Populated in show responses only' })
    baseUnit?: { id: string; name: string; abbreviation: string } | null;

    @ApiPropertyOptional({ description: 'Populated in show responses only', nullable: true })
    brand?: { id: string; name: string; imageUrl: string | null } | null;

    @ApiProperty({ example: 750000, nullable: true })
    defaultSellingPrice: number | null = null;

    @ApiProperty({ example: 600000, nullable: true })
    latestPurchasePrice: number | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/item-main.png', nullable: true })
    mainImageUrl: string | null = null;

    @ApiProperty({ type: [String], example: [] })
    galleryUrls: string[] = [];

    @ApiProperty({ example: 'product', enum: ['product', 'service', 'vehicle', 'bundle'] })
    itemType: ItemType = 'product';

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        example: {},
    })
    customFields: CustomFieldValuesMap = {};

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
