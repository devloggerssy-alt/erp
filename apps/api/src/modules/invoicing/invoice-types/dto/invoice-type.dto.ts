import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

export enum InvoiceDirectionEnum {
    PURCHASE = 'PURCHASE',
    SALE = 'SALE',
}

export class CreateInvoiceTypeDto {
    @ApiProperty({ example: 'PINV', description: 'Unique invoice type code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ type: LocalizedStringDto, description: 'Invoice type display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

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
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

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

    @ApiProperty({ example: 'فاتورة شراء' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

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
