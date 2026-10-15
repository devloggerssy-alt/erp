import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockCountStatus } from '@devloggers/db-prisma';

export class StockCountLineDto {
    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001', description: 'Item ID (Laptop 15")' })
    @IsString() @IsNotEmpty() itemId!: string;

    @ApiProperty({ example: 9, description: 'Physical counted quantity' })
    @IsNumber() countedQuantity!: number;

    @ApiPropertyOptional({ example: '1 unit damaged – written off' })
    @IsOptional() @IsString() notes?: string;
}

export class CreateStockCountDto {
    @ApiProperty({ example: '2026-04-14', description: 'Count date (ISO 8601)' })
    @IsDateString() date!: string;

    @ApiProperty({ example: '00000000-0000-4000-ab00-000000000001', description: 'Warehouse ID (Main Warehouse)' })
    @IsString() @IsNotEmpty() warehouseId!: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID (2026)' })
    @IsString() @IsNotEmpty() fiscalPeriodId!: string;

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
    lines!: StockCountLineDto[];
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class StockCountLineResponseDto {
    @ApiProperty({ type: 'string' }) id: string = '';
    @ApiProperty({ type: 'string' }) itemId: string = '';
    @ApiPropertyOptional({ type: 'string' }) itemName?: string;
    @ApiPropertyOptional({ type: 'string' }) itemCode?: string;
    @ApiProperty({ type: 'number' }) systemQuantity: number = 0;
    @ApiProperty({ type: 'number' }) countedQuantity: number = 0;
    @ApiProperty({ type: 'number' }) difference: number = 0;
    @ApiProperty({ type: 'string', nullable: true }) notes: string | null = null;
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

    @ApiPropertyOptional({ type: 'string' })
    warehouseName?: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001' })
    fiscalPeriodId: string = '';

    @ApiProperty({ enum: StockCountStatus, enumName: 'StockCountStatus', example: StockCountStatus.DRAFT })
    status: StockCountStatus = StockCountStatus.DRAFT;

    @ApiProperty({ type: 'string', nullable: true }) notes: string | null = null;
    @ApiProperty({ type: 'string', nullable: true }) postedAt: string | null = null;
    @ApiProperty({ type: 'string' }) createdAt: string = '';
    @ApiProperty({ type: 'string' }) updatedAt: string = '';

    @ApiPropertyOptional({ type: () => StockCountLineResponseDto, isArray: true })
    lines?: StockCountLineResponseDto[];

    @ApiPropertyOptional({ type: 'number', description: 'Total line count (list view only)' })
    lineCount?: number;
}

