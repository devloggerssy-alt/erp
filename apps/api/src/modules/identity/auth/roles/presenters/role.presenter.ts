import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Role } from '@devloggers/db-prisma';
import type { LocalizedString } from '@devloggers/api-contracts';
import { RoleResponseDto } from '../dto';

@Injectable()
export class RolePresenter extends CrudPresenter<Role, RoleResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: Role): RoleResponseDto {
        const name = entity.name as unknown as LocalizedString;
        const description = entity.description as unknown as LocalizedString | null;
        return {
            id: entity.id,
            name: this.locale.resolve(name),
            nameI18n: name,
            description: description ? this.locale.resolve(description) : null,
            descriptionI18n: description,
            isSystem: entity.isSystem ?? false,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
