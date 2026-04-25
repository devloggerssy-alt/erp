import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsArray,
    IsDateString,
    ValidateNested,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceLineDto {
    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001', description: 'Item ID (Laptop 15")' })
    @IsString()
    @IsNotEmpty()
    itemId: string;

    @ApiProperty({ example: '00000000-0000-4000-a800-000000000001', description: 'Unit ID (Piece)' })
    @IsString()
    @IsNotEmpty()
    unitId: string;

    @ApiProperty({ example: 5 })
    @IsNumber()
    @Min(0.0001)
    quantity: number;

    @ApiProperty({ example: 600000, description: 'Unit price in base currency (SYP)' })
    @IsNumber()
    @Min(0)
    unitPrice: number;

    @ApiPropertyOptional({ example: 2, default: 0, description: 'Discount percentage' })
    @IsOptional()
    @IsNumber()
    discountPercent?: number;

    @ApiPropertyOptional({ example: 0, default: 0, description: 'Tax percentage' })
    @IsOptional()
    @IsNumber()
    taxPercent?: number;

    @ApiPropertyOptional({ example: 'Bulk purchase – 5 units' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: 1, description: 'Display order of the line' })
    @IsOptional()
    @IsNumber()
    sortOrder?: number;
}

export class CreateInvoiceDto {
    @ApiProperty({ example: '00000000-0000-4000-ad00-000000000001', description: 'Invoice type ID (Purchase Invoice)' })
    @IsString()
    @IsNotEmpty()
    invoiceTypeId: string;

    @ApiProperty({ example: '2026-04-14', description: 'Invoice date (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({ example: '2026-05-14', description: 'Payment due date' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiProperty({ example: '00000000-0000-4000-aa00-000000000004', description: 'Party ID (Damascus Import Co.)' })
    @IsString()
    @IsNotEmpty()
    partyId: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-ab00-000000000001', description: 'Warehouse ID (Main Warehouse)' })
    @IsOptional()
    @IsString()
    warehouseId?: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID (2026)' })
    @IsString()
    @IsNotEmpty()
    fiscalPeriodId: string;

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID (SYP)' })
    @IsString()
    @IsNotEmpty()
    currencyId: string;

    @ApiPropertyOptional({ example: 'Purchase order for Q2 stock replenishment' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({
        type: [InvoiceLineDto],
        example: [
            { itemId: '00000000-0000-4000-a900-000000000001', unitId: '00000000-0000-4000-a800-000000000001', quantity: 5, unitPrice: 600000, discountPercent: 2, taxPercent: 0, notes: 'Laptop 15" bulk', sortOrder: 1 },
            { itemId: '00000000-0000-4000-a900-000000000002', unitId: '00000000-0000-4000-a800-000000000001', quantity: 10, unitPrice: 280000, discountPercent: 0, taxPercent: 0, notes: 'Smartphones', sortOrder: 2 },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceLineDto)
    lines: InvoiceLineDto[];
}

export class UpdateInvoiceDto {
    @ApiPropertyOptional({ example: '2026-04-15' })
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional({ example: '2026-05-15' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-aa00-000000000004', description: 'Party ID' })
    @IsOptional()
    @IsString()
    partyId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-ab00-000000000001', description: 'Warehouse ID' })
    @IsOptional()
    @IsString()
    warehouseId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID' })
    @IsOptional()
    @IsString()
    currencyId?: string;

    @ApiPropertyOptional({ example: 'Updated notes – delivery confirmed' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        type: [InvoiceLineDto],
        example: [
            { itemId: '00000000-0000-4000-a900-000000000001', unitId: '00000000-0000-4000-a800-000000000001', quantity: 3, unitPrice: 600000, discountPercent: 0, taxPercent: 0, notes: 'Adjusted quantity', sortOrder: 1 },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceLineDto)
    lines?: InvoiceLineDto[];
}
