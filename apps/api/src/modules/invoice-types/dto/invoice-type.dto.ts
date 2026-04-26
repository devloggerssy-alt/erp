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
    code: string;

    @ApiProperty({ example: 'Purchase Invoice', description: 'Invoice type display name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: InvoiceDirectionEnum, example: 'PURCHASE', description: 'PURCHASE = inbound, SALE = outbound' })
    @IsEnum(InvoiceDirectionEnum)
    @IsNotEmpty()
    direction: InvoiceDirectionEnum;

    @ApiPropertyOptional({ example: true, default: true, description: 'Whether this type affects warehouse stock' })
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
