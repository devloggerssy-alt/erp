import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChartOfAccountResponseDto } from '../accounts/dto';
export class UpsertFinancialSettingBodyDto {
    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000001', description: 'Default sales revenue account' })
    @IsOptional() @IsString()
    defaultSalesAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000002', description: 'Default purchase/COGS account' })
    @IsOptional() @IsString()
    defaultPurchaseAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000003', description: 'Default tax/VAT payable account' })
    @IsOptional() @IsString()
    defaultTaxAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000004', description: 'Default accounts receivable (AR) account' })
    @IsOptional() @IsString()
    defaultReceivableAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000005', description: 'Default accounts payable (AP) account' })
    @IsOptional() @IsString()
    defaultPayableAccountId?: string | null;
}

export class FinancialSettingResponseDto {
    @Type(() => ChartOfAccountResponseDto)
    defaultSalesAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultPurchaseAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultTaxAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultReceivableAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultPayableAccount: ChartOfAccountResponseDto | null = null
}