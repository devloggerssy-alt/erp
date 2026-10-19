import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Cashbox } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { CashboxResponseDto } from '../dto';

@Injectable()
export class CashboxPresenter extends CrudPresenter<Cashbox, CashboxResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: Cashbox): CashboxResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            balance: String(entity.balance),
            currencyId: entity.currencyId,
            branchId: entity.branchId ?? null,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
