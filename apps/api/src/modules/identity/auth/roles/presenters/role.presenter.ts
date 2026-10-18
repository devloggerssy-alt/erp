import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Role } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { RoleResponseDto } from '../dto';
import type { RoleWithPermissions } from '../repositories/roles.repository';

@Injectable()
export class RolePresenter extends CrudPresenter<Role | RoleWithPermissions, RoleResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: Role | RoleWithPermissions): RoleResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };
        const description = toLocalizedString(entity.description);
        const rolePermissions = 'rolePermissions' in entity ? entity.rolePermissions : [];
        return {
            id: entity.id,
            name: this.locale.resolve(name),
            nameI18n: name,
            description: description ? this.locale.resolve(description) : null,
            descriptionI18n: description ?? null,
            isSystem: entity.isSystem ?? false,
            permissionKeys: rolePermissions.map((rolePermission) => rolePermission.permission.key) as RoleResponseDto['permissionKeys'],
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
