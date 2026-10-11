import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import * as bcrypt from 'bcryptjs';

/**
 * Self-service password update. Mirrors the hashing rules used when a user is
 * created (BCRYPT_SALT_ROUNDS, default 10).
 *
 * Existing sessions are intentionally NOT revoked — see
 * docs/adr/0004-password-change-keeps-existing-sessions.md.
 */
@Injectable()
export class ChangePasswordService {
    constructor(private readonly prisma: PrismaService) {}

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.prisma.appUser.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        if (currentPassword === newPassword) {
            throw new BadRequestException('New password must be different from the current password');
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        await this.prisma.appUser.update({
            where: { id: userId },
            data: { passwordHash },
        });
    }
}
