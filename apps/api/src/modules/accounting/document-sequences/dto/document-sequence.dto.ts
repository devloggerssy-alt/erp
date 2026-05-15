import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentSequenceDto {
    @ApiProperty({ example: 'SALES_INVOICE', description: 'Document type (e.g. SALES_INVOICE, PURCHASE_INVOICE, PAYMENT, STOCK_COUNT)' })
    @IsString()
    @IsNotEmpty()
    documentType: string = '';

    @ApiProperty({ example: 'SAL', description: 'Prefix for generated document numbers' })
    @IsString()
    @IsNotEmpty()
    prefix: string = '';

    @ApiPropertyOptional({ example: 1, description: 'Starting number for the sequence' })
    @IsOptional()
    @IsInt()
    @Min(1)
    nextNumber?: number;

    @ApiPropertyOptional({ example: 5, description: 'Zero-pad length (e.g. 5 → SAL-00001)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    padding?: number;
}

export class UpdateDocumentSequenceDto {
    @ApiPropertyOptional({ example: 'INV', description: 'Updated prefix' })
    @IsOptional()
    @IsString()
    prefix?: string;

    @ApiPropertyOptional({ example: 100, description: 'Jump sequence to a specific number' })
    @IsOptional()
    @IsInt()
    @Min(1)
    nextNumber?: number;

    @ApiPropertyOptional({ example: 6 })
    @IsOptional()
    @IsInt()
    @Min(1)
    padding?: number;
}

export class DocumentSequenceResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-b300-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'SALES_INVOICE' })
    documentType: string = '';

    @ApiProperty({ example: 'SAL' })
    prefix: string = '';

    @ApiProperty({ example: 42 })
    nextNumber: number = 1;

    @ApiProperty({ example: 5 })
    padding: number = 5;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
