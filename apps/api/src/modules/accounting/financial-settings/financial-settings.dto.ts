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

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000003', description: 'Default inventory asset account' })
    @IsOptional() @IsString()
    defaultInventoryAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000016', description: 'Default cost-of-goods-sold account' })
    @IsOptional() @IsString()
    defaultCogsAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000005200', description: 'Default inventory adjustment / shrinkage account' })
    @IsOptional() @IsString()
    defaultInventoryAdjustmentAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000003300', description: 'Default opening-balance equity account' })
    @IsOptional() @IsString()
    defaultOpeningEquityAccountId?: string | null;
}

export class FinancialSettingResponseDto {
    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default sales revenue account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultSalesAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default purchase/COGS account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultPurchaseAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default tax/VAT payable account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultTaxAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default accounts receivable (AR) account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultReceivableAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default accounts payable (AP) account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultPayableAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default inventory asset account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultInventoryAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default cost-of-goods-sold account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultCogsAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default inventory adjustment / shrinkage account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultInventoryAdjustmentAccount: ChartOfAccountResponseDto | null = null

    @ApiPropertyOptional({ type: ChartOfAccountResponseDto, nullable: true, description: 'Default opening-balance equity account' })
    @Type(() => ChartOfAccountResponseDto)
    defaultOpeningEquityAccount: ChartOfAccountResponseDto | null = null
}