import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Cashbox } from '@devloggers/db-prisma';
import { CashboxResponseDto } from '../dto';

@Injectable()
export class CashboxPresenter extends CrudPresenter<Cashbox, CashboxResponseDto> {
    toResponse(entity: Cashbox): CashboxResponseDto {
        return {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            currencyId: entity.currencyId,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
