import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@devloggers/db-prisma/nest';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './strategies/jwt.strategy';
import { RegisterDto } from './dto';
import { TenantsService } from '../tenants/tenants.service';
import type { LocalizedString } from '@devloggers/api-contracts';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly tenantsService: TenantsService,
    ) { }

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

    private resolveRoleName(name: unknown): string {
        if (typeof name === 'string') {
            return name;
        }

        const localized = name as LocalizedString;
        return localized.en ?? localized.ar;
    }

    private buildAuthUser(user: {
        id: string;
        tenantId: string;
        email: string;
        fullName: string;
        userRoles: Array<{ role: { name: unknown } }>;
    }) {
        return {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            fullName: user.fullName,
            roles: user.userRoles.map((ur) => this.resolveRoleName(ur.role.name)),
        };
    }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.appUser.findFirst({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const slug = await this.tenantsService.generateUniqueSlug(dto.companyName);

        await this.tenantsService.create({
            name: dto.companyName,
            slug,
            email: dto.email,
            phone: dto.phone,
            adminEmail: dto.email,
            adminPassword: dto.password,
            adminFullName: dto.fullName,
        });

        return this.login(dto.email, dto.password);
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
            user: this.buildAuthUser(user),
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
            roles: user.userRoles.map((ur) => this.resolveRoleName(ur.role.name)),
            tenant: user.tenant,
        };
    }
}
