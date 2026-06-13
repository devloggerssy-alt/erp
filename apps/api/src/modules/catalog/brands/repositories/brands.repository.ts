import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Brand } from '@devloggers/db-prisma';

@Injectable()
export class BrandsRepository extends CrudRepository<Brand> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.brand);
  }

  async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.brand.count({
      where: {
        tenantId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
