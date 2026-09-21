import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';

export const OPENING_SESSION_DIMENSIONS = ['CASHBOX', 'BANK_ACCOUNT', 'PARTY', 'ACCOUNT'] as const;
export type OpeningSessionDimension = (typeof OPENING_SESSION_DIMENSIONS)[number];

export const OPENING_SESSION_STATUSES = ['DRAFT', 'VALIDATED', 'REVIEWED', 'POSTED', 'LOCKED'] as const;
export type OpeningSessionStatus = (typeof OPENING_SESSION_STATUSES)[number];

export const OPENING_SESSION_PARTY_SIDES = ['AR', 'AP'] as const;
export type OpeningSessionPartySide = (typeof OPENING_SESSION_PARTY_SIDES)[number];

export class OpeningBalanceSessionLineDto {
    @ApiProperty({ enum: OPENING_SESSION_DIMENSIONS, enumName: 'OpeningBalanceDimension', example: 'CASHBOX' })
    @IsIn(OPENING_SESSION_DIMENSIONS)
    dimension: OpeningSessionDimension = 'ACCOUNT';

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'ACCOUNT dimension only — direct GL account input' })
    @IsOptional() @IsString()
    accountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'PARTY dimension only' })
    @IsOptional() @IsString()
    partyId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'CASHBOX dimension only' })
    @IsOptional() @IsString()
    cashboxId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'BANK_ACCOUNT dimension only' })
    @IsOptional() @IsString()
    bankAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'Transaction currency. Required for CASHBOX/BANK_ACCOUNT/PARTY.' })
    @IsOptional() @IsString()
    currencyId?: string | null;

    @ApiPropertyOptional({ enum: OPENING_SESSION_PARTY_SIDES, enumName: 'OpeningBalancePartySide', nullable: true, description: 'PARTY only — AR debits the receivable control, AP credits the payable control' })
    @IsOptional() @IsIn(OPENING_SESSION_PARTY_SIDES)
    partySide?: OpeningSessionPartySide | null;

    @ApiProperty({ type: 'number', example: 1500, description: 'Signed transaction-currency amount; positive increases the target balance' })
    @IsNumber()
    amount: number = 0;

    @ApiPropertyOptional({ type: 'number', example: 1, description: 'Locked rate to tenant base currency (ADR-5)' })
    @IsOptional() @IsNumber()
    exchangeRate?: number;
}

export class CreateOpeningBalanceSessionDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000010' })
    @IsString() @IsNotEmpty()
    fiscalPeriodId: string = '';

    @ApiPropertyOptional({ type: 'string' })
    @IsOptional() @IsString()
    description?: string;

    @ApiProperty({ type: () => OpeningBalanceSessionLineDto, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OpeningBalanceSessionLineDto)
    lines: OpeningBalanceSessionLineDto[] = [];
}

export class UpdateOpeningBalanceSessionDto {
    @ApiPropertyOptional({ type: 'string' })
    @IsOptional() @IsString()
    description?: string;

    @ApiPropertyOptional({ type: () => OpeningBalanceSessionLineDto, isArray: true })
    @IsOptional() @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OpeningBalanceSessionLineDto)
    lines?: OpeningBalanceSessionLineDto[];
}

export class OpeningBalanceSessionLineResponseDto {
    @ApiProperty({ type: 'string' })
    id: string = '';

    @ApiProperty({ enum: OPENING_SESSION_DIMENSIONS, enumName: 'OpeningBalanceDimension' })
    dimension: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true })
    accountId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    partyId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    cashboxId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    bankAccountId: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    currencyId: string | null = null;

    @ApiPropertyOptional({ enum: OPENING_SESSION_PARTY_SIDES, enumName: 'OpeningBalancePartySide', nullable: true })
    partySide: string | null = null;

    @ApiProperty({ type: 'number' })
    amount: number = 0;

    @ApiProperty({ type: 'number' })
    exchangeRate: number = 1;
}

export class OpeningBalanceSessionResponseDto {
    @ApiProperty({ type: 'string' })
    id: string = '';

    @ApiProperty({ type: 'string' })
    number: string = '';

    @ApiProperty({ type: 'string' })
    fiscalPeriodId: string = '';

    @ApiProperty({ enum: OPENING_SESSION_STATUSES, enumName: 'OpeningBalanceSessionStatus' })
    status: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true })
    description: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    postedAt: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    postedBy: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    lockedAt: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true })
    lockedBy: string | null = null;

    @ApiProperty({ type: () => OpeningBalanceSessionLineResponseDto, isArray: true })
    lines: OpeningBalanceSessionLineResponseDto[] = [];

    @ApiProperty({ type: 'string' })
    createdAt: string = '';

    @ApiProperty({ type: 'string' })
    updatedAt: string = '';
}