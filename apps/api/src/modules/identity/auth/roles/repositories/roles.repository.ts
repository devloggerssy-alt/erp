import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Role } from '@devloggers/db-prisma';
import type { PermissionKey } from '@devloggers/api-contracts';

export type RoleWithPermissions = Role & {
    rolePermissions: Array<{ permission: { key: string } }>;
};

@Injectable()
export class RolesRepository extends CrudRepository<Role> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.role);
    }

    override async findById(tenantId: string, id: string): Promise<Role | null> {
        return this.prisma.role.findFirst({
            where: { id, tenantId },
            include: { rolePermissions: { include: { permission: true } } },
        });
    }

    async isNameTaken(tenantId: string, nameAr: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.role.count({
            where: {
                tenantId,
                name: { path: ['ar'], equals: nameAr },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }

    /** Replaces the role's grants with exactly `permissionKeys` (unknown keys are ignored). */
    async replacePermissions(roleId: string, permissionKeys: PermissionKey[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId } });
            if (permissionKeys.length === 0) return;

            const permissions = await tx.permission.findMany({
                where: { key: { in: [...permissionKeys] } },
                select: { id: true },
            });
            if (permissions.length === 0) return;

            await tx.rolePermission.createMany({
                data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
                skipDuplicates: true,
            });
        });
    }
}
