import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
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
            invoiceTypeName: this.locale.resolve(entity.invoiceType.name as unknown as LocalizedString),
            cashboxId: entity.cashboxId,
            cashboxName: this.locale.resolve(entity.cashbox.name as unknown as LocalizedString),
            warehouseId: entity.warehouseId,
            warehouseName: this.locale.resolve(entity.warehouse.name as unknown as LocalizedString),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
