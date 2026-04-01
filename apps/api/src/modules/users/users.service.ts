import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.appUser.findMany({
                where: { tenantId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    isActive: true,
                    lastLoginAt: true,
                    createdAt: true,
                    userRoles: {
                        select: { role: { select: { id: true, name: true } } },
                    },
                },
            }),
            this.prisma.appUser.count({ where: { tenantId } }),
        ]);

        return {
            data: data.map((u) => ({
                ...u,
                roles: u.userRoles.map((ur) => ur.role),
                userRoles: undefined,
            })),
            total,
            page,
            limit,
        };
    }

    async create(tenantId: string, dto: CreateUserDto) {
        const existing = await this.prisma.appUser.findUnique({
            where: { tenantId_email: { tenantId, email: dto.email } },
        });
        if (existing) {
            throw new ConflictException('User with this email already exists in this tenant');
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.prisma.appUser.create({
            data: {
                tenantId,
                email: dto.email,
                passwordHash,
                fullName: dto.fullName,
                phone: dto.phone,
                userRoles: dto.roleIds?.length
                    ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
                    : undefined,
            },
            include: {
                userRoles: { include: { role: { select: { id: true, name: true } } } },
            },
        });

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            isActive: user.isActive,
            roles: user.userRoles.map((ur) => ur.role),
        };
    }

    async update(tenantId: string, userId: string, dto: UpdateUserDto) {
        const user = await this.prisma.appUser.findFirst({
            where: { id: userId, tenantId },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // If roleIds provided, replace all role assignments
        if (dto.roleIds !== undefined) {
            await this.prisma.$transaction(async (tx) => {
                await tx.userRole.deleteMany({ where: { userId } });
                if (dto.roleIds!.length > 0) {
                    await tx.userRole.createMany({
                        data: dto.roleIds!.map((roleId) => ({ userId, roleId })),
                    });
                }
            });
        }

        const updated = await this.prisma.appUser.update({
            where: { id: userId },
            data: {
                email: dto.email,
                fullName: dto.fullName,
                phone: dto.phone,
            },
            include: {
                userRoles: { include: { role: { select: { id: true, name: true } } } },
            },
        });

        return {
            id: updated.id,
            email: updated.email,
            fullName: updated.fullName,
            phone: updated.phone,
            isActive: updated.isActive,
            roles: updated.userRoles.map((ur) => ur.role),
        };
    }

    async updateStatus(tenantId: string, userId: string, isActive: boolean) {
        const user = await this.prisma.appUser.findFirst({
            where: { id: userId, tenantId },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.appUser.update({
            where: { id: userId },
            data: { isActive },
            select: { id: true, email: true, fullName: true, isActive: true },
        });
    }
}
