import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { AccountTypeEnum } from './account.dto';

// ── Account balance row ─────────────────────────────────────────────────────

export class AccountBalanceDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000001' })
  id: string = '';

  @ApiProperty({ type: 'string', example: '1110' })
  code: string = '';

  @ApiProperty({ type: 'string', example: 'نقد وما يعادله' })
  name: string = '';

  @ApiProperty({ type: LocalizedStringDto })
  nameI18n: LocalizedStringDto = new LocalizedStringDto();

  @ApiProperty({ enum: AccountTypeEnum, enumName: 'AccountTypeEnum', example: 'ASSET' })
  type: AccountTypeEnum = AccountTypeEnum.ASSET;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a601-000000000000' })
  parentId: string | null = null;

  @ApiProperty({ type: 'boolean', example: true })
  isActive: boolean = true;

  @ApiProperty({ type: 'number', example: 1500, description: 'Signed balance of lines posted directly to this account' })
  ownBalance: number = 0;

  @ApiProperty({ type: 'number', example: 4200, description: 'ownBalance plus the rolled-up balance of all descendants' })
  rolledBalance: number = 0;
}

// ── Account ledger line ─────────────────────────────────────────────────────

export class AccountLedgerLineDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-b101-000000000001' })
  id: string = '';

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-01-15T00:00:00.000Z' })
  date: string = '';

  @ApiProperty({ type: 'string', example: 'JE-2026-000042' })
  entryNumber: string = '';

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Sales invoice INV-000042' })
  description: string | null = null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'invoice' })
  referenceType: string | null = null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-c101-000000000001' })
  referenceId: string | null = null;

  @ApiProperty({ type: 'number', example: 1500 })
  debit: number = 0;

  @ApiProperty({ type: 'number', example: 0 })
  credit: number = 0;
}
