import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashboxDto {
    @ApiProperty({ example: 'CASH-SYP', description: 'Unique cashbox code' })
    @IsString() @IsNotEmpty() code: string;

    @ApiProperty({ example: 'Main Cash (SYP)', description: 'Cashbox display name' })
    @IsString() @IsNotEmpty() name: string;

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID (SYP)' })
    @IsString() @IsNotEmpty() currencyId: string;
}

export class UpdateCashboxDto {
    @ApiPropertyOptional({ example: 'Main Cash Box (SYP)', description: 'Updated cashbox name' })
    @IsOptional() @IsString() name?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean() isActive?: boolean;
}
