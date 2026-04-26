import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentSequenceDto {
    @ApiProperty({ example: 'SALES_INVOICE', description: 'Document type (e.g. PURCHASE_INVOICE, SALES_INVOICE, PAYMENT, RECEIPT, EXPENSE, STOCK_COUNT, JOURNAL_ENTRY)' })
    @IsString()
    @IsNotEmpty()
    documentType: string;

    @ApiProperty({ example: 'SAL', description: 'Prefix for generated document numbers' })
    @IsString()
    @IsNotEmpty()
    prefix: string;

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
