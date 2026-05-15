import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InvoiceDirectionEnum {
    PURCHASE = 'PURCHASE',
    SALE = 'SALE',
}

export class CreateInvoiceTypeDto {
    @ApiProperty({ example: 'PINV', description: 'Unique invoice type code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ example: 'Purchase Invoice', description: 'Invoice type display name' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

    @ApiProperty({ enum: InvoiceDirectionEnum, example: 'PURCHASE', description: 'PURCHASE = inbound, SALE = outbound' })
    @IsEnum(InvoiceDirectionEnum)
    @IsNotEmpty()
    direction: InvoiceDirectionEnum = InvoiceDirectionEnum.PURCHASE;

    @ApiPropertyOptional({ example: true, description: 'Whether this type affects warehouse stock' })
    @IsOptional()
    @IsBoolean()
    affectsStock?: boolean;
}

export class UpdateInvoiceTypeDto {
    @ApiPropertyOptional({ example: 'Purchase Invoice (Standard)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    affectsStock?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class InvoiceTypeResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-d100-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'PINV' })
    code: string = '';

    @ApiProperty({ example: 'Purchase Invoice' })
    name: string = '';

    @ApiProperty({ enum: InvoiceDirectionEnum, example: 'PURCHASE' })
    direction: string = '';

    @ApiProperty({ example: true })
    affectsStock: boolean = true;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
