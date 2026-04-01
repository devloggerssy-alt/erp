import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@devloggers/db-prisma/nest';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    async validateUser(email: string, password: string) {
        const user = await this.prisma.appUser.findFirst({
            where: { email, isActive: true },
            include: {
                userRoles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    async login(email: string, password: string) {
        const user = await this.validateUser(email, password);

        const payload: JwtPayload = {
            sub: user.id,
            tenantId: user.tenantId,
            email: user.email,
        };

        const accessToken = this.jwtService.sign(payload);

        // Update last login
        await this.prisma.appUser.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return {
            accessToken,
            user: {
                id: user.id,
                tenantId: user.tenantId,
                email: user.email,
                fullName: user.fullName,
                roles: user.userRoles.map((ur) => ur.role.name),
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.prisma.appUser.findUnique({
            where: { id: userId },
            include: {
                userRoles: {
                    include: { role: true },
                },
                tenant: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            roles: user.userRoles.map((ur) => ur.role.name),
            tenant: user.tenant,
        };
    }
}
