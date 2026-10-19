import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { InvoiceType } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { InvoiceTypeResponseDto } from '../dto';

@Injectable()
export class InvoiceTypePresenter extends CrudPresenter<InvoiceType, InvoiceTypeResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: InvoiceType): InvoiceTypeResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            direction: entity.direction,
            affectsStock: entity.affectsStock,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
