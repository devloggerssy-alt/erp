import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Currency } from '@devloggers/db-prisma';
import type { LocalizedString } from '@devloggers/api-contracts';
import { CurrencyResponseDto } from '../dto';

@Injectable()
export class CurrencyPresenter extends CrudPresenter<Currency, CurrencyResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: Currency): CurrencyResponseDto {
        const name = entity.name as unknown as LocalizedString;
        const symbol = entity.symbol as unknown as LocalizedString | null;
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            symbol: symbol ? this.locale.resolve(symbol) : null,
            symbolI18n: symbol,
            isBase: entity.isBase,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
