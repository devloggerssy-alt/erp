import { ApiProperty } from '@nestjs/swagger';

export class StockBalanceReportItemDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-b100-000000000001' })
    itemId: string = '';

    @ApiProperty({ type: 'string', example: 'Laptop 15"' })
    itemName: string = '';

    @ApiProperty({ type: 'string', example: 'LAP-15' })
    itemCode: string = '';

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-c100-000000000001' })
    warehouseId: string = '';

    @ApiProperty({ type: 'string', example: 'Main Warehouse' })
    warehouseName: string = '';

    @ApiProperty({ type: 'string', example: 'MAIN' })
    warehouseCode: string = '';

    @ApiProperty({ type: 'number', example: 50 })
    quantity: number = 0;

    @ApiProperty({ type: 'number', example: 1200.5 })
    averageCost: number = 0;

    @ApiProperty({ type: 'string', example: '2026-04-14T09:30:00.000Z' })
    updatedAt: string = '';
}

export class InvoiceReportPartyDto {
    @ApiProperty({ type: 'string', example: 'Aleppo Electronics Co.' })
    name: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: 'C-001' })
    code: string | null = null;
}

export class InvoiceReportItemDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-d100-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', example: 'SI-2026-0001' })
    number: string = '';

    @ApiProperty({ type: 'string', example: '2026-04-14T09:30:00.000Z' })
    date: string = '';

    @ApiProperty({ type: 'number', example: 600000 })
    total: number = 0;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-e100-000000000001' })
    partyId: string = '';

    @ApiProperty({ type: () => InvoiceReportPartyDto, nullable: true })
    party: InvoiceReportPartyDto | null = null;
}

export class SalesSummaryResponseDto {
    @ApiProperty({ type: () => InvoiceReportItemDto, isArray: true })
    invoices: InvoiceReportItemDto[] = [];

    @ApiProperty({ type: 'number', example: 15000000 })
    totalSales: number = 0;

    @ApiProperty({ type: 'number', example: 12 })
    count: number = 0;
}

export class PurchaseSummaryResponseDto {
    @ApiProperty({ type: () => InvoiceReportItemDto, isArray: true })
    invoices: InvoiceReportItemDto[] = [];

    @ApiProperty({ type: 'number', example: 8000000 })
    totalPurchases: number = 0;

    @ApiProperty({ type: 'number', example: 5 })
    count: number = 0;
}

export class PartyStatementPartyDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-e100-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', example: 'Aleppo Electronics Co.' })
    name: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: 'C-001' })
    code: string | null = null;
}

export class PartyStatementPaymentDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-f100-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', example: '2026-04-15T12:00:00.000Z' })
    date: string = '';

    @ApiProperty({ type: 'number', example: 200000 })
    amount: number = 0;
}

export class PartyStatementResponseDto {
    @ApiProperty({ type: () => PartyStatementPartyDto, nullable: true })
    party: PartyStatementPartyDto | null = null;

    @ApiProperty({ type: () => InvoiceReportItemDto, isArray: true })
    invoices: InvoiceReportItemDto[] = [];

    @ApiProperty({ type: () => PartyStatementPaymentDto, isArray: true })
    payments: PartyStatementPaymentDto[] = [];

    @ApiProperty({ type: 'number', example: 600000 })
    totalInvoiced: number = 0;

    @ApiProperty({ type: 'number', example: 200000 })
    totalPaid: number = 0;

    @ApiProperty({ type: 'number', example: 400000 })
    balance: number = 0;
}

export class ProfitSummaryResponseDto {
    @ApiProperty({ type: 'number', example: 15000000 })
    totalSales: number = 0;

    @ApiProperty({ type: 'number', example: 8000000 })
    totalPurchases: number = 0;

    @ApiProperty({ type: 'number', example: 2000000 })
    totalExpenses: number = 0;

    @ApiProperty({ type: 'number', example: 7000000 })
    grossProfit: number = 0;

    @ApiProperty({ type: 'number', example: 5000000 })
    netProfit: number = 0;
}
