import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentSequenceDto {
    @ApiProperty({ example: 'SALES_INVOICE' })
    @IsString()
    @IsNotEmpty()
    documentType: string;

    @ApiProperty({ example: 'SAL' })
    @IsString()
    @IsNotEmpty()
    prefix: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    nextNumber?: number;

    @ApiPropertyOptional({ example: 5, description: 'Zero-pad length' })
    @IsOptional()
    @IsInt()
    @Min(1)
    padding?: number;
}

export class UpdateDocumentSequenceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    prefix?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    nextNumber?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    padding?: number;
}
