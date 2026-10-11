import { Injectable } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto';

/**
 * Self-service profile updates for the authenticated user. Only the fields on
 * UpdateProfileDto are writable — email, password, status and roles are not.
 */
@Injectable()
export class ProfileService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async updateMe(tenantId: string, userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
        await this.usersRepository.findByIdInTenant(tenantId, userId);

        const updated = await this.usersRepository.updateUser(userId, {
            fullName: dto.fullName,
            phone: dto.phone,
            avatarUrl: dto.avatarUrl,
        });

        return {
            id: updated.id,
            email: updated.email,
            fullName: updated.fullName,
            phone: updated.phone,
            avatarUrl: updated.avatarUrl,
        };
    }
}
