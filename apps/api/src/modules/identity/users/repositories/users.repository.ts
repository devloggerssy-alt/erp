import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

const USER_SELECT = {
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
} satisfies Prisma.AppUserSelect;

export type UserWithRoles = Prisma.AppUserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class UsersRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.appUser.findMany({
                where: { tenantId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: USER_SELECT,
            }),
            this.prisma.appUser.count({ where: { tenantId } }),
        ]);

        return { data, total };
    }

    async findByEmailInTenant(tenantId: string, email: string) {
        return this.prisma.appUser.findUnique({
            where: { tenantId_email: { tenantId, email } },
        });
    }

    async findByIdInTenant(tenantId: string, userId: string) {
        const user = await this.prisma.appUser.findFirst({
            where: { id: userId, tenantId },
            select: USER_SELECT,
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async deleteUser(tenantId: string, userId: string) {
        await this.findByIdInTenant(tenantId, userId);
        await this.prisma.appUser.delete({ where: { id: userId } });
    }

    async createUser(data: {
        tenantId: string;
        email: string;
        passwordHash: string;
        fullName: string;
        phone?: string;
        roleIds?: string[];
    }) {
        return this.prisma.appUser.create({
            data: {
                tenantId: data.tenantId,
                email: data.email,
                passwordHash: data.passwordHash,
                fullName: data.fullName,
                phone: data.phone,
                userRoles: data.roleIds?.length
                    ? { create: data.roleIds.map((roleId) => ({ roleId })) }
                    : undefined,
            },
            include: {
                userRoles: { include: { role: { select: { id: true, name: true } } } },
            },
        });
    }

    async replaceRoles(userId: string, roleIds: string[]) {
        await this.prisma.$transaction(async (tx) => {
            await tx.userRole.deleteMany({ where: { userId } });
            if (roleIds.length > 0) {
                await tx.userRole.createMany({
                    data: roleIds.map((roleId) => ({ userId, roleId })),
                });
            }
        });
    }

    async updateUser(userId: string, data: {
        email?: string;
        fullName?: string;
        phone?: string | null;
        avatarUrl?: string | null;
    }) {
        return this.prisma.appUser.update({
            where: { id: userId },
            data,
            include: {
                userRoles: { include: { role: { select: { id: true, name: true } } } },
            },
        });
    }

    async updateStatus(userId: string, isActive: boolean) {
        return this.prisma.appUser.update({
            where: { id: userId },
            data: { isActive },
            select: { id: true, email: true, fullName: true, isActive: true },
        });
    }
}
