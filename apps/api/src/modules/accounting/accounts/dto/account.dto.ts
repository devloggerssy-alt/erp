import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { AccountType } from '@devloggers/db-prisma';

// ── Enum ──────────────────────────────────────────────────────────────────────

export enum AccountTypeEnum {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
}

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateChartOfAccountDto {
    @ApiProperty({ example: '1110', description: 'Unique account code within the tenant' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ type: LocalizedStringDto, description: 'Account display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ enum: AccountTypeEnum, example: 'ASSET', description: 'Account type classification' })
    @IsEnum(AccountTypeEnum)
    type: AccountTypeEnum = AccountTypeEnum.ASSET;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', description: 'Parent account UUID for hierarchical grouping' })
    @IsOptional()
    @IsString()
    parentId?: string;
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateChartOfAccountDto {
    @ApiPropertyOptional({ type: LocalizedStringDto, description: 'Updated account name' })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', nullable: true, description: 'Updated parent account UUID — set to null to make it a root account' })
    @IsOptional()
    @IsString()
    parentId?: string | null;

    @ApiPropertyOptional({ example: true, description: 'Deactivate to hide from document selection' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ── Response DTO ──────────────────────────────────────────────────────────────

export class ChartOfAccountResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-a601-000000000001' })
    id: string = '';

    @ApiProperty({ example: '1110' })
    code: string = '';

    @ApiProperty({ example: 'نقد وما يعادله' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ enum: AccountTypeEnum, example: 'ASSET' })
    type: string = '';

    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', nullable: true })
    parentId: string | null = null;

    @ApiPropertyOptional({ example: '1000', nullable: true })
    parentCode: string | null = null;

    @ApiPropertyOptional({ example: 'الأصول المتداولة', nullable: true })
    parentName: string | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}

// ── Tree DTO ─────────────────────────────────────────────────────────────────

export class ChartOfAccountTreeDto {
    @ApiProperty({ description: 'Account UUID' })
    id: string;

    @ApiProperty({ description: 'Account code' })
    code: string;

    @ApiProperty({ description: 'Locale-resolved display name' })
    name: string;

    @ApiProperty({ description: 'Raw localized name object' })
    nameI18n: object;

    @ApiProperty({ enum: AccountType, description: 'Account type' })
    type: AccountType;

    @ApiProperty({ nullable: true, description: 'Parent account UUID or null' })
    parentId: string | null;

    @ApiProperty({ description: 'Whether account is active' })
    isActive: boolean;
}
