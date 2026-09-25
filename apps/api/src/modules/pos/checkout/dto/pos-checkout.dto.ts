import {
    IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ArrayMinSize, ValidateNested, Min, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PosCheckoutLineDto {
    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001' })
    @IsString() @IsNotEmpty()
    itemId!: string;

    @ApiProperty({ example: '00000000-0000-4000-a800-000000000001' })
    @IsString() @IsNotEmpty()
    unitId!: string;

    @ApiProperty({ example: 2 })
    @IsNumber() @Min(0.0001)
    quantity!: number;

    @ApiProperty({ example: 15000, description: 'Unit price in tenant base currency' })
    @IsNumber() @Min(0)
    unitPrice!: number;

    @ApiPropertyOptional({ example: 0, default: 0, description: 'Discount percentage' })
    @IsOptional() @IsNumber() @Min(0)
    discountPercent?: number;
}

export class CreatePosCheckoutDto {
    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'Named customer; omitted defaults to the tenant walk-in customer' })
    @IsOptional() @IsString()
    partyId?: string | null;

    @ApiProperty({ type: () => PosCheckoutLineDto, isArray: true })
    @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PosCheckoutLineDto)
    lines!: PosCheckoutLineDto[];

    @ApiProperty({ example: 50000, description: 'Cash amount tendered by the customer' })
    @IsNumber() @Min(0)
    tendered!: number;

    @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'Client-generated UUID; retrying the same cart sends the same value' })
    @IsUUID()
    clientRequestId!: string;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    @IsOptional() @IsString()
    notes?: string | null;
}

export class PosCheckoutResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-e000-000000000001' })
    invoiceId: string = '';

    @ApiProperty({ example: 'SAL-00042' })
    invoiceNumber: string = '';

    @ApiProperty({ example: '00000000-0000-4000-e000-000000000002' })
    paymentId: string = '';

    @ApiProperty({ example: 'REC-00042' })
    paymentNumber: string = '';

    @ApiProperty({ example: 30000 })
    total: number = 0;

    @ApiProperty({ example: 50000 })
    tendered: number = 0;

    @ApiProperty({ example: 20000 })
    change: number = 0;

    @ApiProperty({ example: '2026-09-25T10:00:00.000Z' })
    date: string = '';

    @ApiProperty({ example: false, description: 'True when this response replays an earlier checkout with the same clientRequestId' })
    replayed: boolean = false;
}
