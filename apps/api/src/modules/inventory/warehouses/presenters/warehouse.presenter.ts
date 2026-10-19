import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Warehouse } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { WarehouseResponseDto, WarehouseBranchRefDto } from '../dto';
import type { WarehouseWithBranches } from '../repositories/warehouses.repository';

/** A plain row (create path) or a detail row loaded with its branch links. */
export type WarehouseEntity = Warehouse | WarehouseWithBranches;

@Injectable()
export class WarehousePresenter extends CrudPresenter<WarehouseEntity, WarehouseResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: WarehouseEntity): WarehouseResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };

        const dto = new WarehouseResponseDto();
        dto.id = entity.id;
        dto.code = entity.code;
        dto.name = this.locale.resolve(name);
        dto.nameI18n = name;
        dto.address = entity.address ?? null;
        dto.isActive = entity.isActive;
        dto.createdAt = entity.createdAt.toISOString();
        dto.updatedAt = entity.updatedAt.toISOString();

        const links = 'branches' in entity ? entity.branches : undefined;
        dto.branches = (links ?? []).map((link) => {
            const ref = new WarehouseBranchRefDto();
            ref.id = link.branch.id;
            ref.code = link.branch.code;
            ref.name = this.locale.resolve(toLocalizedString(link.branch.name) ?? { ar: '' });
            return ref;
        });

        return dto;
    }
}
