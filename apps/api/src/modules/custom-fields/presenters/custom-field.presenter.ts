import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { CustomField } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { CustomFieldResponseDto } from '../dto';

@Injectable()
export class CustomFieldPresenter extends CrudPresenter<CustomField, CustomFieldResponseDto> {
    toResponse(entity: CustomField): CustomFieldResponseDto {
        return {
            id: entity.id,
            module: entity.module,
            name: toLocalizedString(entity.name) ?? { ar: '' },
            label: toLocalizedString(entity.label) ?? { ar: '' },
            type: entity.type,
            defaultValue: entity.defaultValue ?? null,
            placeholder: toLocalizedString(entity.placeholder) ?? null,
            options: entity.options ?? [],
            isRequired: entity.isRequired,
            showInList: entity.showInList,
            createdAt: entity.createdAt.toISOString(),
        };
    }
}
