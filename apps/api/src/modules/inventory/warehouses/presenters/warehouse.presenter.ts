import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Warehouse } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { WarehouseResponseDto } from '../dto';

@Injectable()
export class WarehousePresenter extends CrudPresenter<Warehouse, WarehouseResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: Warehouse): WarehouseResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            address: entity.address ?? null,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
