import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { CustomField } from '@devloggers/db-prisma';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { CustomFieldResponseDto } from '../dto';

@Injectable()
export class CustomFieldPresenter extends CrudPresenter<CustomField, CustomFieldResponseDto> {
    toResponse(entity: CustomField): CustomFieldResponseDto {
        return {
            id: entity.id,
            module: entity.module,
            name: entity.name as unknown as LocalizedStringDto,
            label: entity.label as unknown as LocalizedStringDto,
            type: entity.type,
            defaultValue: entity.defaultValue ?? null,
            placeholder: (entity.placeholder as unknown as LocalizedStringDto | null) ?? null,
            options: entity.options ?? [],
            isRequired: entity.isRequired,
            showInList: entity.showInList,
            createdAt: entity.createdAt.toISOString(),
        };
    }
}
