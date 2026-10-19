import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Branch } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { BranchResponseDto, BranchWarehouseRefDto } from '../dto';
import type { BranchWithWarehouses } from '../repositories/branches.repository';

/** A plain row (create path) or a detail row loaded with its warehouse links. */
export type BranchEntity = Branch | BranchWithWarehouses;

@Injectable()
export class BranchPresenter extends CrudPresenter<BranchEntity, BranchResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: BranchEntity): BranchResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };

        const dto = new BranchResponseDto();
        dto.id = entity.id;
        dto.code = entity.code;
        dto.name = this.locale.resolve(name);
        dto.nameI18n = name;
        dto.address = entity.address ?? null;
        dto.phone = entity.phone ?? null;
        dto.email = entity.email ?? null;
        dto.isActive = entity.isActive;
        dto.createdAt = entity.createdAt.toISOString();
        dto.updatedAt = entity.updatedAt.toISOString();

        const links = 'warehouses' in entity ? entity.warehouses : undefined;
        dto.warehouses = (links ?? []).map((link) => {
            const ref = new BranchWarehouseRefDto();
            ref.id = link.warehouse.id;
            ref.code = link.warehouse.code;
            ref.name = this.locale.resolve(toLocalizedString(link.warehouse.name) ?? { ar: '' });
            return ref;
        });

        return dto;
    }
}
