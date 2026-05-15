import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiProperty({ example: 'Cash and Cash Equivalents', description: 'Account display name' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

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
    @ApiPropertyOptional({ example: 'Cash and Bank Accounts', description: 'Updated account name' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

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

    @ApiProperty({ example: 'Cash and Cash Equivalents' })
    name: string = '';

    @ApiProperty({ enum: AccountTypeEnum, example: 'ASSET' })
    type: string = '';

    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', nullable: true })
    parentId: string | null = null;

    @ApiPropertyOptional({ example: '1000', nullable: true })
    parentCode: string | null = null;

    @ApiPropertyOptional({ example: 'Current Assets', nullable: true })
    parentName: string | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
