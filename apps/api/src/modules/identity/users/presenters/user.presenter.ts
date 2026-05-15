import { Injectable } from '@nestjs/common';
import { UserResponseDto, UserRoleDto } from '../dto/user.dto';

type UserWithRoles = {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    userRoles: { role: { id: string; name: string } }[];
};

@Injectable()
export class UserPresenter {
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
            role.name = ur.role.name;
            return role;
        });
        return dto;
    }
}
