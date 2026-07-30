import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Payment } from '@devloggers/db-prisma';

@Injectable()
export class PaymentsRepository extends CrudRepository<Payment> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.payment);
  }

  async findManyWithRelations(tenantId: string, options: { skip?: number; take?: number; where?: Record<string, any> }) {
    const where = { tenantId, ...options.where };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          cashbox: { select: { name: true, code: true } },
          party: { select: { name: true } },
          currency: { select: { code: true, symbol: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total };
  }

  async findByIdWithDetail(tenantId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        cashbox: true,
        party: { select: { name: true, receivableAccountId: true, payableAccountId: true } },
        currency: true,
        fiscalPeriod: { select: { status: true } },
        allocations: { include: { invoice: { select: { number: true, total: true } } } },
      },
    });
  }
}
