import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Tag } from '@devloggers/db-prisma';

@Injectable()
export class TagsRepository extends CrudRepository<Tag> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.tag);
  }

  async isNameTakenInModule(
    tenantId: string,
    name: string,
    module: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.tag.count({
      where: {
        tenantId,
        name,
        module,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
