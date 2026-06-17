import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';

export class CreateCashboxDto {
    @ApiProperty({ example: 'CASH-SYP', description: 'Unique cashbox code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ type: LocalizedStringDto, description: 'Cashbox display name' })
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID' })
    @IsString()
    @IsNotEmpty()
    currencyId: string = '';
}

export class UpdateCashboxDto {
    @ApiPropertyOptional({ type: LocalizedStringDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedStringDto)
    name?: LocalizedStringDto;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class CashboxResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-d200-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'CASH-SYP' })
    code: string = '';

    @ApiProperty({ example: 'الصندوق الرئيسي' })
    name: string = '';

    @ApiProperty({ type: LocalizedStringDto })
    nameI18n: LocalizedStringDto = new LocalizedStringDto();

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001' })
    currencyId: string = '';

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';


    @ApiProperty({example:"0.00"})
    balance:string ='';
}
