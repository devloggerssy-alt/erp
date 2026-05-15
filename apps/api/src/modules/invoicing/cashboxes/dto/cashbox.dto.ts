import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashboxDto {
    @ApiProperty({ example: 'CASH-SYP', description: 'Unique cashbox code' })
    @IsString()
    @IsNotEmpty()
    code: string = '';

    @ApiProperty({ example: 'Main Cash (SYP)', description: 'Cashbox display name' })
    @IsString()
    @IsNotEmpty()
    name: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID' })
    @IsString()
    @IsNotEmpty()
    currencyId: string = '';
}

export class UpdateCashboxDto {
    @ApiPropertyOptional({ example: 'Main Cash Box (SYP)' })
    @IsOptional()
    @IsString()
    name?: string;

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

    @ApiProperty({ example: 'Main Cash (SYP)' })
    name: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001' })
    currencyId: string = '';

    @ApiProperty({ example: true })
    isActive: boolean = true;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}
