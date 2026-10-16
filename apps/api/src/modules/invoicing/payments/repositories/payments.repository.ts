import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StatusGuardedCrudRepository } from '@devloggers/backend-core';
import type { Payment, Prisma } from '@devloggers/db-prisma';

const PAYMENT_LIST_INCLUDE = {
  cashbox: { select: { name: true, code: true } },
  party: { select: { name: true } },
  currency: { select: { code: true, symbol: true } },
} satisfies Prisma.PaymentInclude;

const PAYMENT_DETAIL_INCLUDE = {
  cashbox: true,
  party: { select: { name: true, receivableAccountId: true, payableAccountId: true } },
  currency: true,
  fiscalPeriod: { select: { status: true } },
  allocations: { include: { invoice: { select: { number: true, total: true } } } },
} satisfies Prisma.PaymentInclude;

export type PaymentListItem = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_LIST_INCLUDE }>;
export type PaymentDetail = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_DETAIL_INCLUDE }>;

@Injectable()
export class PaymentsRepository extends StatusGuardedCrudRepository<Payment, Prisma.PaymentDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.payment);
  }

  async findManyWithRelations(tenantId: string, options: { skip?: number; take?: number; where?: Record<string, any> }) {
    const where = { tenantId, ...options.where };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total };
  }

  async findByIdWithDetail(tenantId: string, id: string): Promise<PaymentDetail | null> {
    return this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: PAYMENT_DETAIL_INCLUDE,
    });
  }
}
