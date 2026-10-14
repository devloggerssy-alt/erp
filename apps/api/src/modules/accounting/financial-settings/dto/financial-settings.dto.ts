import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000001', description: 'Default Cash control account (shared; subledger via cashboxId)' })
    @IsOptional() @IsString()
    defaultCashAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000024', description: 'Default Bank control account (shared; subledger via bankAccountId)' })
    @IsOptional() @IsString()
    defaultBankAccountId?: string | null;
}

export class FinancialSettingResponseDto {
    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000001', description: 'Default sales revenue account' })
    defaultSalesAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000002', description: 'Default purchase/COGS account' })
    defaultPurchaseAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000003', description: 'Default tax/VAT payable account' })
    defaultTaxAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000004', description: 'Default accounts receivable (AR) account' })
    defaultReceivableAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a600-000000000005', description: 'Default accounts payable (AP) account' })
    defaultPayableAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000003', description: 'Default inventory asset account' })
    defaultInventoryAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000016', description: 'Default cost-of-goods-sold account' })
    defaultCogsAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000005200', description: 'Default inventory adjustment / shrinkage account' })
    defaultInventoryAdjustmentAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000003300', description: 'Default opening-balance equity account' })
    defaultOpeningEquityAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000001', description: 'Default Cash control account' })
    defaultCashAccountId: string | null = null;

    @ApiProperty({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000024', description: 'Default Bank control account' })
    defaultBankAccountId: string | null = null;
}