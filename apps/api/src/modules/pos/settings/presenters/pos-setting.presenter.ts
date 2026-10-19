import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { toLocalizedString } from '@/common/i18n/localized-string';
import type { PosSettingWithRelations } from '../repositories/pos-settings.repository';
import { PosSettingResponseDto } from '../dto';

@Injectable()
export class PosSettingPresenter {
    constructor(private readonly locale: LocaleResolverService) {}

    toResponse(entity: PosSettingWithRelations): PosSettingResponseDto {
        return {
            id: entity.id,
            defaultPartyId: entity.defaultPartyId,
            defaultPartyName: entity.defaultParty.name,
            invoiceTypeId: entity.invoiceTypeId,
            invoiceTypeName: this.locale.resolve(toLocalizedString(entity.invoiceType.name)),
            cashboxId: entity.cashboxId,
            cashboxName: this.locale.resolve(toLocalizedString(entity.cashbox.name)),
            warehouseId: entity.warehouseId,
            warehouseName: this.locale.resolve(toLocalizedString(entity.warehouse.name)),
            branchId: entity.branchId ?? null,
            branchCode: entity.branch?.code,
            branchName: entity.branch
                ? this.locale.resolve(toLocalizedString(entity.branch.name))
                : undefined,
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
