import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentTypeEnum {
    RECEIPT = 'RECEIPT',
    PAYMENT = 'PAYMENT',
    EXPENSE = 'EXPENSE',
    ADJUSTMENT = 'ADJUSTMENT',
}

export class CreatePaymentDto {
    @ApiProperty({ enum: PaymentTypeEnum, example: 'RECEIPT', description: 'Payment type' })
    @IsEnum(PaymentTypeEnum)
    type: PaymentTypeEnum;

    @ApiProperty({ example: '2026-04-14', description: 'Payment date (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001', description: 'Cashbox ID (Main Cash SYP)' })
    @IsString() @IsNotEmpty()
    cashboxId: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-aa00-000000000001', description: 'Party ID (Ahmad Al-Hassan)' })
    @IsOptional() @IsString()
    partyId?: string;

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID (SYP)' })
    @IsString() @IsNotEmpty()
    currencyId: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID (2026)' })
    @IsString() @IsNotEmpty()
    fiscalPeriodId: string;

    @ApiProperty({ example: 250000, description: 'Payment amount in currency' })
    @IsNumber() @Min(0.01)
    amount: number;

    @ApiPropertyOptional({ example: 'Payment received for invoice SAL-00001' })
    @IsOptional() @IsString()
    notes?: string;
}

export class UpdatePaymentDto {
    @ApiPropertyOptional({ example: '2026-04-15' })
    @IsOptional() @IsDateString() date?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-ac00-000000000001', description: 'Cashbox ID' })
    @IsOptional() @IsString() cashboxId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-aa00-000000000001', description: 'Party ID' })
    @IsOptional() @IsString() partyId?: string;

    @ApiPropertyOptional({ example: 300000, description: 'Updated amount' })
    @IsOptional() @IsNumber() @Min(0.01) amount?: number;

    @ApiPropertyOptional({ example: 'Adjusted payment – partial refund applied' })
    @IsOptional() @IsString() notes?: string;
}

export class AllocatePaymentDto {
    @ApiProperty({ example: '00000000-0000-4000-ad00-000000000001', description: 'Invoice ID placeholder (Real ID would be from creation)' })
    @IsString() @IsNotEmpty()
    invoiceId: string;

    @ApiProperty({ example: 250000, description: 'Amount to allocate to this invoice' })
    @IsNumber() @Min(0.01)
    amount: number;
}
