import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccountTypeEnum {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
}

export class CreateChartOfAccountDto {
    @ApiProperty({ example: '1110', description: 'Unique account code' })
    @IsString() @IsNotEmpty() code: string;

    @ApiProperty({ example: 'Cash and Cash Equivalents', description: 'Account display name' })
    @IsString() @IsNotEmpty() name: string;

    @ApiProperty({ enum: AccountTypeEnum, example: 'ASSET', description: 'Account type' })
    @IsEnum(AccountTypeEnum) type: AccountTypeEnum;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', description: 'Parent account ID (Current Assets)' })
    @IsOptional() @IsString() parentId?: string;
}

export class UpdateChartOfAccountDto {
    @ApiPropertyOptional({ example: 'Cash and Bank Accounts', description: 'Updated account name' })
    @IsOptional() @IsString() name?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a601-000000000001', description: 'Parent account ID' })
    @IsOptional() @IsString() parentId?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean() isActive?: boolean;
}
