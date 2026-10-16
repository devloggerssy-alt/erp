import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { UserResponseDto, UserRoleDto } from '../dto/user.dto';
import type { UserWithRoles } from '../repositories/users.repository';

@Injectable()
export class UserPresenter {
    constructor(private readonly locale: LocaleResolverService) {}

    toResponse(user: UserWithRoles): UserResponseDto {
        const dto = new UserResponseDto();
        dto.id = user.id;
        dto.email = user.email;
        dto.fullName = user.fullName;
        dto.phone = user.phone;
        dto.isActive = user.isActive;
        dto.lastLoginAt = user.lastLoginAt?.toISOString() ?? null;
        dto.createdAt = user.createdAt.toISOString();
        dto.roles = user.userRoles.map((ur) => {
            const role = new UserRoleDto();
            role.id = ur.role.id;
            role.name = this.locale.resolve(toLocalizedString(ur.role.name));
            return role;
        });
        return dto;
    }
}
