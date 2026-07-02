import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString } from 'class-validator';

/** Exact phrase a user must type to confirm a financial data reset. */
export const RESET_FINANCE_CONFIRMATION = 'RESET FINANCE';
/** Exact phrase a user must type to confirm an inventory data reset. */
export const RESET_INVENTORY_CONFIRMATION = 'RESET INVENTORY';

// ── Request DTOs ────────────────────────────────────────────────────────────

export class ResetFinanceDto {
    @ApiProperty({
        type: 'string',
        example: RESET_FINANCE_CONFIRMATION,
        description: `Confirmation phrase. Must be exactly "${RESET_FINANCE_CONFIRMATION}".`,
    })
    @IsString()
    @Equals(RESET_FINANCE_CONFIRMATION, { message: 'Confirmation phrase does not match' })
    confirmation: string = '';
}

export class ResetInventoryDto {
    @ApiProperty({
        type: 'string',
        example: RESET_INVENTORY_CONFIRMATION,
        description: `Confirmation phrase. Must be exactly "${RESET_INVENTORY_CONFIRMATION}".`,
    })
    @IsString()
    @Equals(RESET_INVENTORY_CONFIRMATION, { message: 'Confirmation phrase does not match' })
    confirmation: string = '';
}

// ── Response DTOs ───────────────────────────────────────────────────────────

export class FinanceResetResultDto {
    @ApiProperty({ type: 'number', example: 30, description: 'Payment allocations deleted' })
    paymentAllocations: number = 0;

    @ApiProperty({ type: 'number', example: 12, description: 'Payments deleted' })
    payments: number = 0;

    @ApiProperty({ type: 'number', example: 8, description: 'Invoices deleted (lines cascade)' })
    invoices: number = 0;

    @ApiProperty({ type: 'number', example: 5, description: 'Expenses deleted (items cascade)' })
    expenses: number = 0;

    @ApiProperty({ type: 'number', example: 20, description: 'Journal entries deleted (lines cascade)' })
    journalEntries: number = 0;

    @ApiProperty({ type: 'number', example: 3, description: 'Cashboxes whose balance was reset to 0' })
    cashboxesReset: number = 0;

    @ApiProperty({ type: 'number', example: 15, description: 'GL accounts whose balance was reset to 0' })
    accountsReset: number = 0;
}

export class InventoryResetResultDto {
    @ApiProperty({ type: 'number', example: 120, description: 'Stock movements deleted' })
    stockMovements: number = 0;

    @ApiProperty({ type: 'number', example: 45, description: 'Stock balances deleted' })
    stockBalances: number = 0;

    @ApiProperty({ type: 'number', example: 6, description: 'Stock counts deleted (lines cascade)' })
    stockCounts: number = 0;
}
