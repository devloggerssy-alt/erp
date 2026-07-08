import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsArray,
    IsDateString,
    IsBoolean,
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

export class CreateInvoiceOpeningPaymentDto {
    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001', description: 'Cashbox ID the opening payment is deposited into' })
    @IsString()
    @IsNotEmpty()
    cashboxId: string;

    @ApiProperty({ example: 250000, description: 'Opening payment amount in invoice currency' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiPropertyOptional({ example: 1.0, description: 'Exchange rate to base currency (defaults to the invoice exchange rate)' })
    @IsOptional()
    @IsNumber()
    @Min(0.0001)
    exchangeRate?: number;
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

    @ApiPropertyOptional({ example: 1.0, description: 'Exchange rate to base currency (default 1)' })
    @IsOptional()
    @IsNumber()
    @Min(0.0001)
    exchangeRate?: number;

    @ApiPropertyOptional({ example: 'Purchase order for Q2 stock replenishment' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: false, description: 'If true, the invoice is posted immediately after creation instead of staying DRAFT' })
    @IsOptional()
    @IsBoolean()
    complete?: boolean;

    @ApiPropertyOptional({ type: () => CreateInvoiceOpeningPaymentDto, description: 'Optional opening payment recorded against this invoice at creation time' })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateInvoiceOpeningPaymentDto)
    openingPayment?: CreateInvoiceOpeningPaymentDto;

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

export class AddInvoicePaymentDto {
    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001', description: 'Cashbox ID the payment is deposited into' })
    @IsString()
    @IsNotEmpty()
    cashboxId: string;

    @ApiProperty({ example: 250000, description: 'Payment amount in invoice currency' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ example: '2026-04-20', description: 'Payment date (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({ example: 1.0, description: 'Exchange rate to base currency (defaults to the invoice exchange rate)' })
    @IsOptional()
    @IsNumber()
    @Min(0.0001)
    exchangeRate?: number;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class InvoiceLineResponseDto {
    @ApiProperty({ type: 'string' }) id: string = '';
    @ApiProperty({ type: 'string' }) itemId: string = '';
    @ApiPropertyOptional({ type: 'string' }) itemName?: string;
    @ApiPropertyOptional({ type: 'string' }) itemCode?: string;
    @ApiProperty({ type: 'string' }) unitId: string = '';
    @ApiPropertyOptional({ type: 'string' }) unitName?: string;
    @ApiPropertyOptional({ type: 'string' }) unitAbbreviation?: string;
    @ApiProperty({ type: 'number' }) quantity: number = 0;
    @ApiProperty({ type: 'number' }) unitPrice: number = 0;
    @ApiProperty({ type: 'number' }) discountPercent: number = 0;
    @ApiProperty({ type: 'number' }) discountAmount: number = 0;
    @ApiProperty({ type: 'number' }) taxPercent: number = 0;
    @ApiProperty({ type: 'number' }) taxAmount: number = 0;
    @ApiProperty({ type: 'number' }) total: number = 0;
    @ApiPropertyOptional({ type: 'string', nullable: true }) notes: string | null = null;
    @ApiPropertyOptional({ type: 'number' }) sortOrder?: number;
}

export enum InvoicePaidStatus {
    UNPAID = 'UNPAID',
    PARTIAL = 'PARTIAL',
    PAID = 'PAID',
}

export class InvoicePaymentResponseDto {
    @ApiProperty({ type: 'string', description: 'Payment allocation ID' }) id: string = '';
    @ApiProperty({ type: 'string' }) paymentId: string = '';
    @ApiProperty({ type: 'string', example: 'PAY-00002' }) paymentNumber: string = '';
    @ApiProperty({ type: 'number', example: 250000 }) amount: number = 0;
    @ApiProperty({ type: 'string', example: '2026-04-14T00:00:00.000Z' }) date: string = '';
    @ApiProperty({ type: 'string' }) createdAt: string = '';
}

export class InvoiceResponseDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-ae00-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', example: 'INV-00001' })
    number: string = '';

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-ad00-000000000001' })
    invoiceTypeId: string = '';

    @ApiPropertyOptional({ type: 'string', example: 'Purchase Invoice', description: 'Invoice type display name, resolved to the request locale' })
    invoiceTypeName?: string;

    @ApiPropertyOptional({ type: 'string', example: 'PURCHASE', description: 'PURCHASE | SALE' })
    invoiceTypeDirection?: string;

    @ApiProperty({ type: 'string', example: '2026-04-14T00:00:00.000Z' })
    date: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true }) dueDate: string | null = null;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-aa00-000000000004' })
    partyId: string = '';

    @ApiPropertyOptional({ type: 'string', example: 'Damascus Import Co.' }) partyName?: string;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '123 Main St' }) partyAddress?: string | null;
    @ApiPropertyOptional({ type: 'string', nullable: true, example: '+963 11 1234567' }) partyPhone?: string | null;
    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'contact@example.com' }) partyEmail?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true }) warehouseId: string | null = null;
    @ApiPropertyOptional({ type: 'string', example: 'Main Warehouse' }) warehouseName?: string;

    @ApiProperty({ type: 'string' }) fiscalPeriodId: string = '';
    @ApiProperty({ type: 'string' }) currencyId: string = '';
    @ApiPropertyOptional({ type: 'string', example: 'SYP' }) currencyCode?: string;
    @ApiPropertyOptional({ type: 'string', example: '£' }) currencySymbol?: string;

    @ApiProperty({ type: 'number', example: 1, description: 'Exchange rate to tenant base currency' })
    exchangeRate: number = 1;

    @ApiProperty({ type: 'string', example: 'DRAFT', description: 'DRAFT | POSTED | CANCELLED' })
    status: string = 'DRAFT';

    @ApiProperty({ type: 'number' }) subtotal: number = 0;
    @ApiProperty({ type: 'number' }) discountAmount: number = 0;
    @ApiProperty({ type: 'number' }) taxAmount: number = 0;
    @ApiProperty({ type: 'number' }) total: number = 0;

    @ApiPropertyOptional({ type: 'string', nullable: true }) notes: string | null = null;
    @ApiPropertyOptional({ type: 'string', nullable: true }) postedAt: string | null = null;
    @ApiProperty({ type: 'string' }) createdAt: string = '';
    @ApiProperty({ type: 'string' }) updatedAt: string = '';

    @ApiProperty({ type: 'number', example: 500000, description: 'Sum of payments allocated to this invoice' })
    amountPaid: number = 0;

    @ApiProperty({ type: 'number', example: 700000, description: 'Remaining unpaid amount (total - amountPaid)' })
    balanceDue: number = 0;

    @ApiProperty({ enum: InvoicePaidStatus, enumName: 'InvoicePaidStatus', example: InvoicePaidStatus.UNPAID, description: 'Derived from amountPaid vs total' })
    paidStatus: InvoicePaidStatus = InvoicePaidStatus.UNPAID;

    @ApiPropertyOptional({ type: () => InvoiceLineResponseDto, isArray: true })
    lines?: InvoiceLineResponseDto[];

    @ApiPropertyOptional({ type: () => InvoicePaymentResponseDto, isArray: true, description: 'Payments allocated to this invoice (detail view only)' })
    payments?: InvoicePaymentResponseDto[];

    @ApiPropertyOptional({ type: 'number', description: 'Total line count (list view only)' })
    lineCount?: number;
}
