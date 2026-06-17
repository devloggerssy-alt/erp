import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Cashbox } from '@devloggers/db-prisma';
import type { LocalizedString } from '@devloggers/api-contracts';
import { CashboxResponseDto } from '../dto';

@Injectable()
export class CashboxPresenter extends CrudPresenter<Cashbox, CashboxResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: Cashbox): CashboxResponseDto {
        const name = entity.name as unknown as LocalizedString;
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            balance: entity.balance,
            currencyId: entity.currencyId,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
