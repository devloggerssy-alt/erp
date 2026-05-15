import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Currency } from '@devloggers/db-prisma';
import { CurrencyResponseDto } from '../dto';

@Injectable()
export class CurrencyPresenter extends CrudPresenter<Currency, CurrencyResponseDto> {
    toResponse(entity: Currency): CurrencyResponseDto {
        return {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            symbol: entity.symbol ?? null,
            isBase: entity.isBase,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
