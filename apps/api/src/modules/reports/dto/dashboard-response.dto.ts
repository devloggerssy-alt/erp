import { ApiProperty } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

export class DashboardCashboxCurrencyDto {
    @ApiProperty({ type: 'string', example: 'SYP' })
    code: string = '';

    @ApiProperty({ type: () => LocalizedStringDto, nullable: true })
    symbol: LocalizedStringDto | null = null;
}

export class DashboardCashboxDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-c200-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', example: 'MAIN' })
    code: string = '';

    @ApiProperty({ type: () => LocalizedStringDto })
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ type: 'string', example: '1500.25', description: 'Decimal balance, serialized as a string' })
    balance: string = '0';

    @ApiProperty({ type: () => DashboardCashboxCurrencyDto })
    currency: DashboardCashboxCurrencyDto = new DashboardCashboxCurrencyDto();
}

export class DashboardSummaryResponseDto {
    @ApiProperty({ type: 'number', example: 15000000 })
    totalSales: number = 0;

    @ApiProperty({ type: 'number', example: 8000000 })
    totalPurchases: number = 0;

    @ApiProperty({ type: 'number', example: 2000000 })
    totalExpenses: number = 0;

    @ApiProperty({ type: 'number', example: 5000000 })
    netProfit: number = 0;

    @ApiProperty({ type: () => DashboardCashboxDto, isArray: true })
    cashboxes: DashboardCashboxDto[] = [];

    @ApiProperty({ type: 'number', example: 3 })
    lowStockItemsCount: number = 0;

    @ApiProperty({ type: 'number', example: 120 })
    totalActiveItems: number = 0;

    @ApiProperty({ type: 'number', example: 40 })
    totalActiveParties: number = 0;
}

export class DashboardChartPointDto {
    @ApiProperty({ type: 'string', example: '2026-06-01' })
    date: string = '';

    @ApiProperty({ type: 'number', example: 4200 })
    sales: number = 0;

    @ApiProperty({ type: 'number', example: 1800 })
    purchases: number = 0;
}

export class DashboardExpenseBreakdownItemDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a600-000000000001' })
    accountId: string = '';

    @ApiProperty({ type: () => LocalizedStringDto, nullable: true })
    accountName: LocalizedStringDto | null = null;

    @ApiProperty({ type: 'number', example: 250000 })
    total: number = 0;
}

export class DashboardTopItemDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-b100-000000000001' })
    itemId: string = '';

    @ApiProperty({ type: 'string', example: 'Laptop 15"' })
    itemName: string = '';

    @ApiProperty({ type: 'string', example: 'LAP-15' })
    itemCode: string = '';

    @ApiProperty({ type: 'number', example: 4 })
    quantity: number = 0;

    @ApiProperty({ type: 'number', example: 2400000 })
    revenue: number = 0;
}
