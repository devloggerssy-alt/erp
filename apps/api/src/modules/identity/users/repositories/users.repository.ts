import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

const userSelect = {
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
} as const;

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
                select: userSelect,
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
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
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

    async updateUser(userId: string, data: { email?: string; fullName?: string; phone?: string }) {
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
