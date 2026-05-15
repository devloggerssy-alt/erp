import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';
import { ConflictException } from '@nestjs/common';

/**
 * Units repository — handles all data access for the `units` table.
 *
 * Extends CrudRepository<Unit> which provides tenant-scoped findMany,
 * findById, create, update, delete, and exists helpers automatically.
 *
 * Add domain-specific query methods here as the module grows.
 */
@Injectable()
export class UnitsRepository extends CrudRepository<Unit> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.unit);
  }

  /**
   * Check whether a unit name is already taken within the tenant,
   * optionally excluding a specific record (used during update).
   */
  async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.unit.count({
      where: {
        tenantId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
