import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import { UserResponseDto, UserRoleDto } from '../dto/user.dto';

type UserWithRoles = {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    userRoles: { role: { id: string; name: unknown } }[];
};

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
            role.name = this.locale.resolve(ur.role.name as LocalizedString);
            return role;
        });
        return dto;
    }
}
