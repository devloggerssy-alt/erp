import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Role } from '@devloggers/db-prisma';

@Injectable()
export class RolesRepository extends CrudRepository<Role> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.role);
    }

    async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.role.count({
            where: {
                tenantId,
                name,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
}
