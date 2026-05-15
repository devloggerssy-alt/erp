import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockCountLineDto {
    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001', description: 'Item ID (Laptop 15")' })
    @IsString() @IsNotEmpty() itemId: string;

    @ApiProperty({ example: 9, description: 'Physical counted quantity' })
    @IsNumber() countedQuantity: number;

    @ApiPropertyOptional({ example: '1 unit damaged – written off' })
    @IsOptional() @IsString() notes?: string;
}

export class CreateStockCountDto {
    @ApiProperty({ example: '2026-04-14', description: 'Count date (ISO 8601)' })
    @IsDateString() date: string;

    @ApiProperty({ example: '00000000-0000-4000-ab00-000000000001', description: 'Warehouse ID (Main Warehouse)' })
    @IsString() @IsNotEmpty() warehouseId: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID (2026)' })
    @IsString() @IsNotEmpty() fiscalPeriodId: string;

    @ApiPropertyOptional({ example: 'Quarterly physical stock count – Q2 2026' })
    @IsOptional() @IsString() notes?: string;

    @ApiProperty({
        type: [StockCountLineDto],
        example: [
            { itemId: '00000000-0000-4000-a900-000000000001', countedQuantity: 9, notes: '1 unit damaged' },
            { itemId: '00000000-0000-4000-a900-000000000002', countedQuantity: 20, notes: null },
        ],
    })
    @IsArray() @ValidateNested({ each: true }) @Type(() => StockCountLineDto)
    lines: StockCountLineDto[];
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class StockCountLineResponseDto {
    @ApiProperty() id: string = '';
    @ApiProperty() itemId: string = '';
    @ApiPropertyOptional() itemName?: string;
    @ApiPropertyOptional() itemCode?: string;
    @ApiProperty() systemQuantity: number = 0;
    @ApiProperty() countedQuantity: number = 0;
    @ApiProperty() difference: number = 0;
    @ApiPropertyOptional({ nullable: true }) notes: string | null = null;
}

export class StockCountResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-ac10-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'SC-00001' })
    number: string = '';

    @ApiProperty({ example: '2026-04-14T00:00:00.000Z' })
    date: string = '';

    @ApiProperty({ example: '00000000-0000-4000-ab00-000000000001' })
    warehouseId: string = '';

    @ApiPropertyOptional() warehouseName?: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001' })
    fiscalPeriodId: string = '';

    @ApiProperty({ example: 'DRAFT', description: 'DRAFT | POSTED | CANCELLED' })
    status: string = 'DRAFT';

    @ApiPropertyOptional({ nullable: true }) notes: string | null = null;
    @ApiPropertyOptional({ nullable: true }) postedAt: string | null = null;
    @ApiProperty() createdAt: string = '';
    @ApiProperty() updatedAt: string = '';

    @ApiPropertyOptional({ type: [StockCountLineResponseDto] })
    lines?: StockCountLineResponseDto[];

    @ApiPropertyOptional({ description: 'Total line count (list view only)' })
    lineCount?: number;
}

