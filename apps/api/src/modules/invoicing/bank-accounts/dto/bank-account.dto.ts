import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

export class CreateBankAccountDto {
    @ApiProperty({ example: 'BANK-SYP', description: 'Unique bank account code' })
    @IsString()
    @IsNotEmpty()
    code!: string;

    @ApiProperty({ type: LocalizedStringDto, description: 'Bank account display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name!: LocalizedStringDto;

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID' })
    @IsString()
    @IsNotEmpty()
    currencyId!: string;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '1234567890', description: 'Bank account number' })
    @IsOptional()
    @IsString()
    accountNumber?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Commercial Bank', description: 'Bank name' })
    @IsOptional()
    @IsString()
    bankName?: string | null;
}

export class UpdateBankAccountDto {
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '1234567890' })
    @IsOptional()
    @IsString()
    accountNumber?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Commercial Bank' })
    @IsOptional()
    @IsString()
    bankName?: string | null;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class BankAccountResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-d200-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'BANK-SYP' })
    code: string = '';

    @ApiProperty({ example: 'البنك الرئيسي' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001' })
    currencyId: string = '';

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '1234567890' })
    accountNumber: string | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Commercial Bank' })
    bankName: string | null = null;

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';

    @ApiProperty({ example: '0.00' })
    balance: string = '';
}
