import { Injectable } from '@nestjs/common';
import type { FinancialSetting } from '@devloggers/db-prisma';
import { FinancialSettingResponseDto } from '../dto';

@Injectable()
export class FinancialSettingPresenter {
    toResponse(entity: FinancialSetting): FinancialSettingResponseDto {
        return {
            defaultSalesAccountId: entity.defaultSalesAccountId ?? null,
            defaultPurchaseAccountId: entity.defaultPurchaseAccountId ?? null,
            defaultTaxAccountId: entity.defaultTaxAccountId ?? null,
            defaultReceivableAccountId: entity.defaultReceivableAccountId ?? null,
            defaultPayableAccountId: entity.defaultPayableAccountId ?? null,
            defaultInventoryAccountId: entity.defaultInventoryAccountId ?? null,
            defaultCogsAccountId: entity.defaultCogsAccountId ?? null,
            defaultInventoryAdjustmentAccountId: entity.defaultInventoryAdjustmentAccountId ?? null,
            defaultOpeningEquityAccountId: entity.defaultOpeningEquityAccountId ?? null,
            defaultCashAccountId: entity.defaultCashAccountId ?? null,
            defaultBankAccountId: entity.defaultBankAccountId ?? null,
        };
    }
}
