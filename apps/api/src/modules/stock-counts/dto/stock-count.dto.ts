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
