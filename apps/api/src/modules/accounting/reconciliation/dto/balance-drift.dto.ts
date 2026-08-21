import { ApiProperty } from '@nestjs/swagger';

/**
 * Phase 0.2 — drift report DTOs.
 *
 * Response DTOs (presenter-built, never validated), so fields carry initializers
 * rather than `!` — see F11 in the refactor spec.
 */

export class CashboxDriftDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a001-000000000001' })
    cashboxId: string = '';

    @ApiProperty({ type: 'string', example: 'CASH-USD' })
    code: string = '';

    @ApiProperty({ type: 'number', example: 15000, description: 'Denormalized Cashbox.balance' })
    cachedBalance: number = 0;

    @ApiProperty({
        type: 'number',
        example: 14750,
        description: 'Recomputed from posted receipts − posted payments − posted expenses',
    })
    derivedBalance: number = 0;

    @ApiProperty({ type: 'number', example: 250, description: 'cached − derived; non-zero means drift' })
    difference: number = 0;
}

export class StockBalanceDriftDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a001-000000000002' })
    warehouseId: string = '';

    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a001-000000000003' })
    itemId: string = '';

    @ApiProperty({ type: 'number', example: 40, description: 'Denormalized StockBalance.quantity' })
    cachedQuantity: number = 0;

    @ApiProperty({ type: 'number', example: 38, description: 'SUM(StockMovement.quantity)' })
    derivedQuantity: number = 0;

    @ApiProperty({ type: 'number', example: 2 })
    difference: number = 0;
}

export class UnbalancedJournalEntryDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a001-000000000004' })
    journalEntryId: string = '';

    @ApiProperty({ type: 'string', example: 'JE-000042' })
    number: string = '';

    @ApiProperty({ type: 'number', example: 1000 })
    totalDebit: number = 0;

    @ApiProperty({ type: 'number', example: 999.5 })
    totalCredit: number = 0;

    @ApiProperty({ type: 'number', example: 0.5 })
    difference: number = 0;
}

export class CashSubledgerDriftDto {
    @ApiProperty({ type: 'string', nullable: true, example: 'SYP', description: 'null = base-currency lines without an explicit currency' })
    currencyId: string | null = null;

    @ApiProperty({ type: 'number', example: 12000, description: 'Σ(debit−credit) on the Cash control account for this currency' })
    glBalance: number = 0;

    @ApiProperty({ type: 'number', example: 12000, description: 'Σ(debit−credit) of all lines carrying a cashboxId for this currency' })
    subledgerBalance: number = 0;

    @ApiProperty({ type: 'number', example: 0 })
    difference: number = 0;
}

export class PartySubledgerDriftDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a602-000000001120', description: 'AR or AP control account id' })
    controlAccountId: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: 'USD', description: 'null = base-currency lines' })
    currencyId: string | null = null;

    @ApiProperty({ type: 'number', example: 500 })
    glBalance: number = 0;

    @ApiProperty({ type: 'number', example: 500, description: 'Σ(debit−credit) of party-attributed lines on the control account' })
    subledgerBalance: number = 0;

    @ApiProperty({ type: 'number', example: 0 })
    difference: number = 0;
}

export class BankSubledgerDriftDto {
    @ApiProperty({ type: 'string', nullable: true, example: 'USD' })
    currencyId: string | null = null;

    @ApiProperty({ type: 'number', example: 0 })
    glBalance: number = 0;

    @ApiProperty({ type: 'number', example: 0 })
    subledgerBalance: number = 0;

    @ApiProperty({ type: 'number', example: 0 })
    difference: number = 0;
}

export class BankAccountDriftDto {
    @ApiProperty({ type: 'string' })
    bankAccountId: string = '';

    @ApiProperty({ type: 'string' })
    code: string = '';

    @ApiProperty({ type: 'number', description: 'Denormalized BankAccount.balance' })
    cachedBalance: number = 0;

    @ApiProperty({ type: 'number', description: 'Σ(debit−credit) of posted journal lines for this bank account' })
    derivedBalance: number = 0;

    @ApiProperty({ type: 'number' })
    difference: number = 0;
}

export class BalanceDriftReportDto {
    @ApiProperty({ type: 'string', example: '2026-07-26T10:00:00.000Z' })
    generatedAt: string = '';

    @ApiProperty({ type: 'boolean', example: false, description: 'True when every section is empty' })
    clean: boolean = true;

    @ApiProperty({ type: () => CashboxDriftDto, isArray: true })
    cashboxes: CashboxDriftDto[] = [];

    @ApiProperty({ type: () => StockBalanceDriftDto, isArray: true })
    stockBalances: StockBalanceDriftDto[] = [];

    @ApiProperty({
        type: () => UnbalancedJournalEntryDto,
        isArray: true,
        description: 'Posted entries where debits ≠ credits — should always be empty',
    })
    unbalancedEntries: UnbalancedJournalEntryDto[] = [];

    @ApiProperty({ type: () => CashSubledgerDriftDto, isArray: true })
    cashSubledgers: CashSubledgerDriftDto[] = [];

    @ApiProperty({ type: () => PartySubledgerDriftDto, isArray: true })
    partySubledgers: PartySubledgerDriftDto[] = [];

    @ApiProperty({ type: () => BankSubledgerDriftDto, isArray: true })
    bankSubledgers: BankSubledgerDriftDto[] = [];

    @ApiProperty({ type: () => BankAccountDriftDto, isArray: true })
    bankAccounts: BankAccountDriftDto[] = [];

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: ['StockBalance.averageCost is not recomputed — see Phase 5'],
        description: 'Checks deliberately not performed, so an empty report is not over-read',
    })
    notChecked: string[] = [];
}
