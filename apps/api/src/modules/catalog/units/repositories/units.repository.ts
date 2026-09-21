import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Prisma, Unit } from '@devloggers/db-prisma';

@Injectable()
export class UnitsRepository extends CrudRepository<Unit, Prisma.UnitDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.unit);
  }

  async createMany(data: Prisma.UnitCreateManyInput[]): Promise<number> {
    const result = await this.prisma.unit.createMany({ data });
    return result.count;
  }
}
