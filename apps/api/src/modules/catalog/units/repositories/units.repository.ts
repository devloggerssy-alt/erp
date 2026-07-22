import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';

@Injectable()
export class UnitsRepository extends CrudRepository<Unit> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.unit);
  }
}
