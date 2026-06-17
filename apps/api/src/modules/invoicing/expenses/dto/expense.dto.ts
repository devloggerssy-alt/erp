import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseItemDto {
    @ApiProperty({ example: '00000000-0000-4000-a600-000000006120', description: 'EXPENSE-type chart-of-account ID (debited)' })
    @IsString() @IsNotEmpty()
    accountId: string;

    @ApiProperty({ example: 'Office rent — April', description: 'Line description' })
    @IsString() @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 200000, description: 'Line amount' })
    @IsNumber() @Min(0.01)
    amount: number;

    @ApiPropertyOptional({ example: 'Paid in cash' })
    @IsOptional() @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: 0, description: 'Display order' })
    @IsOptional() @IsInt()
    sortOrder?: number;
}

export class CreateExpenseDto {
    @ApiProperty({ example: '2026-06-10', description: 'Expense date (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001', description: 'Cashbox ID (must have a linked account)' })
    @IsString() @IsNotEmpty()
    cashboxId: string;

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID' })
    @IsString() @IsNotEmpty()
    currencyId: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID' })
    @IsString() @IsNotEmpty()
    fiscalPeriodId: string;

    @ApiPropertyOptional({ example: 1.0, description: 'Exchange rate to base currency (default 1)' })
    @IsOptional() @IsNumber() @Min(0.0001)
    exchangeRate?: number;

    @ApiPropertyOptional({ example: 'April fixed costs' })
    @IsOptional() @IsString()
    notes?: string;

    @ApiProperty({ type: [CreateExpenseItemDto] })
    @ValidateNested({ each: true })
    @Type(() => CreateExpenseItemDto)
    @ArrayMinSize(1)
    items: CreateExpenseItemDto[];
}

export class UpdateExpenseDto {
    @ApiPropertyOptional({ example: '2026-06-11' })
    @IsOptional() @IsDateString() date?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-ac00-000000000001' })
    @IsOptional() @IsString() cashboxId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a300-000000000001' })
    @IsOptional() @IsString() currencyId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a400-000000000001' })
    @IsOptional() @IsString() fiscalPeriodId?: string;

    @ApiPropertyOptional({ example: 'Updated notes' })
    @IsOptional() @IsString() notes?: string;

    @ApiPropertyOptional({ type: [CreateExpenseItemDto], description: 'Replaces all items when provided' })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateExpenseItemDto)
    @ArrayMinSize(1)
    items?: CreateExpenseItemDto[];
}
