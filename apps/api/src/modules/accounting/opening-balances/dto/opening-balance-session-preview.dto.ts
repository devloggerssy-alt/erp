import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OPENING_SESSION_DIMENSIONS, OPENING_SESSION_PARTY_SIDES } from './opening-balance-session.dto';

export class OpeningBalancePreviewCurrencyTotalDto {
    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'Currency id; null = base-currency bucket (GL lines without a currency)' })
    currencyId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    currencyCode: string | null = null;

    @ApiProperty({ type: 'number', example: 1500, description: 'Base-currency debit total' })
    debit: number = 0;

    @ApiProperty({ type: 'number', example: 1500, description: 'Base-currency credit total' })
    credit: number = 0;

    @ApiProperty({ type: 'number', example: 0, description: 'debit - credit (base), 4dp' })
    net: number = 0;
}

export class OpeningBalancePreviewOffsetDto {
    @ApiProperty({ type: 'string', description: 'Resolved opening-equity account id' })
    accountId: string = '';

    @ApiProperty({ type: 'string', example: '3000' })
    accountCode: string = '';

    @ApiProperty({ type: 'number', example: 250, description: '|base imbalance|, 4dp' })
    amount: number = 0;
}

export class OpeningBalancePreviewLineDto {
    @ApiProperty({ enum: OPENING_SESSION_DIMENSIONS, enumName: 'OpeningBalanceDimension' })
    dimension: string = '';

    @ApiProperty({ type: 'string' })
    accountId: string = '';

    @ApiProperty({ type: 'string' })
    accountCode: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true })
    partyId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    partyName: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    cashboxId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    bankAccountId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    currencyId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    currencyCode: string | null = null;

    @ApiProperty({ type: 'number', description: 'Signed transaction-currency amount as entered' })
    amount: number = 0;

    @ApiProperty({ type: 'number', example: 1 })
    exchangeRate: number = 1;

    @ApiProperty({ type: 'number', description: 'Base-currency debit' })
    debit: number = 0;

    @ApiProperty({ type: 'number', description: 'Base-currency credit' })
    credit: number = 0;
}

export class OpeningBalancePreviewPartyDto {
    @ApiProperty({ type: 'string' })
    partyId: string = '';

    @ApiProperty({ type: 'string' })
    partyName: string = '';

    @ApiProperty({ enum: OPENING_SESSION_PARTY_SIDES, enumName: 'OpeningBalancePartySide' })
    side: string = '';

    @ApiProperty({ type: 'string', description: 'Resolved AR/AP control account' })
    accountId: string = '';

    @ApiProperty({ type: 'string' })
    accountCode: string = '';

    @ApiProperty({ type: 'string' })
    currencyId: string = '';

    @ApiProperty({ type: 'string' })
    currencyCode: string = '';

    @ApiProperty({ type: 'number', description: 'Session opening impact (base), signed' })
    openingNet: number = 0;

    @ApiProperty({ type: 'number', description: 'Currently posted balance for this party + account + currency (base)' })
    currentBalance: number = 0;

    @ApiProperty({ type: 'number', description: 'currentBalance + openingNet, 4dp' })
    resultingBalance: number = 0;
}

export class OpeningBalanceSessionPreviewDto {
    @ApiProperty({ type: 'string' })
    sessionId: string = '';

    @ApiProperty({ type: 'string' })
    number: string = '';

    @ApiProperty({ type: 'string' })
    status: string = '';

    @ApiProperty({ type: () => OpeningBalancePreviewCurrencyTotalDto, isArray: true })
    currencyTotals: OpeningBalancePreviewCurrencyTotalDto[] = [];

    @ApiPropertyOptional({ type: () => OpeningBalancePreviewOffsetDto, nullable: true, description: 'null when the session is balanced' })
    offset: OpeningBalancePreviewOffsetDto | null = null;

    @ApiProperty({ type: () => OpeningBalancePreviewLineDto, isArray: true })
    lines: OpeningBalancePreviewLineDto[] = [];

    @ApiProperty({ type: () => OpeningBalancePreviewPartyDto, isArray: true })
    parties: OpeningBalancePreviewPartyDto[] = [];
}
