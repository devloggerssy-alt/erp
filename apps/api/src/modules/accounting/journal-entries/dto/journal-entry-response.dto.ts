import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { AccountType, JournalEntryStatus, ReferenceType } from '@devloggers/db-prisma';

/**
 * Account reference returned inside a journal line. The list endpoint selects
 * only `code`/`name`; the detail endpoint returns the full account, so the
 * remaining fields are optional.
 */
export class JournalEntryLineAccountDto {
    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', description: 'Present on the detail response only' })
    id?: string;

    @ApiProperty({ example: '1110' })
    code: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    name!: LocalizedStringDto;

    @ApiPropertyOptional({ enum: AccountType, example: 'ASSET' })
    type?: AccountType;
}

export class JournalEntryLineDto {
    @ApiProperty({ example: '00000000-0000-4000-b100-000000000001' })
    id: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    tenantId: string = '';

    @ApiProperty({ example: '00000000-0000-4000-b000-000000000001' })
    journalEntryId: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a601-000000000001' })
    accountId: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    partyId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    cashboxId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    bankAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    currencyId?: string | null;

    @ApiProperty({ example: 600000, description: 'Transaction-currency amount' })
    amount: number = 0;

    @ApiProperty({ example: 1 })
    exchangeRate: number = 1;

    @ApiProperty({ example: 600000 })
    debit: number = 0;

    @ApiProperty({ example: 0 })
    credit: number = 0;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    description?: string | null;

    @ApiProperty({ example: 0 })
    sortOrder: number = 0;

    @ApiProperty({ type: () => JournalEntryLineAccountDto })
    account: JournalEntryLineAccountDto = new JournalEntryLineAccountDto();
}

export class JournalEntryResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-b000-000000000001' })
    id: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    tenantId: string = '';

    @ApiProperty({ example: 'JE-00001' })
    number: string = '';

    @ApiProperty({ type: 'string', example: '2026-04-14T00:00:00.000Z' })
    date: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001' })
    fiscalPeriodId: string = '';

    @ApiPropertyOptional({ enum: ReferenceType, nullable: true, example: 'INVOICE' })
    referenceType?: ReferenceType | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    referenceId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Sales invoice posting' })
    description?: string | null;

    @ApiProperty({ enum: JournalEntryStatus, example: 'POSTED' })
    status: JournalEntryStatus = JournalEntryStatus.POSTED;

    @ApiProperty({ example: 1, description: 'Exchange rate to tenant base currency, locked at posting time' })
    exchangeRate: number = 1;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '2026-04-14T10:00:00.000Z' })
    postedAt?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    reversalOfId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: null })
    reversalDate?: string | null;

    @ApiProperty({ example: '00000000-0000-4000-a200-000000000001' })
    createdBy: string = '';

    @ApiProperty({ type: 'string', example: '2026-04-14T10:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ type: 'string', example: '2026-04-14T10:00:00.000Z' })
    updatedAt: string = '';

    @ApiProperty({ type: () => JournalEntryLineDto, isArray: true })
    lines: JournalEntryLineDto[] = [];
}
