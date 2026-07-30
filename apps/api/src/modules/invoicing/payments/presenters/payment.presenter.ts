import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Payment } from '@devloggers/db-prisma';
import { PaymentResponseDto, PaymentAllocationResponseDto } from '../dto/payment-response.dto';

type PaymentWithRelations = Payment & {
  cashbox?: { name?: string; code?: string; linkedAccountId?: string | null };
  party?: { name?: string; receivableAccountId?: string | null; payableAccountId?: string | null } | null;
  currency?: { code?: string; symbol?: unknown };
  fiscalPeriod?: { status?: string };
  allocations?: Array<{
    id: string; invoiceId: string; amount: { toNumber(): number } | number; createdAt: Date;
    invoice?: { number?: string; total?: unknown };
  }>;
};

@Injectable()
export class PaymentPresenter extends CrudPresenter<PaymentWithRelations, PaymentResponseDto> {
  toResponse(entity: PaymentWithRelations): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = entity.id;
    dto.number = entity.number;
    dto.type = entity.type;
    dto.date = entity.date instanceof Date ? entity.date.toISOString() : String(entity.date);
    dto.status = entity.status;
    dto.cashboxId = entity.cashboxId;
    dto.cashboxName = entity.cashbox?.name;
    dto.cashboxCode = entity.cashbox?.code;
    dto.partyId = entity.partyId ?? null;
    dto.partyName = entity.party?.name;
    dto.currencyId = entity.currencyId;
    dto.currencyCode = entity.currency?.code;
    dto.currencySymbol = entity.currency?.symbol as string | undefined;
    dto.fiscalPeriodId = entity.fiscalPeriodId;
    dto.amount = PaymentPresenter.toNum(entity.amount);
    dto.exchangeRate = PaymentPresenter.toNum(entity.exchangeRate);
    dto.unallocatedAmount = PaymentPresenter.toNum(entity.unallocatedAmount);
    dto.allocatedAmount = PaymentPresenter.toNum(entity.allocatedAmount);
    dto.notes = entity.notes ?? null;
    dto.postedAt = entity.postedAt ? new Date(entity.postedAt).toISOString() : null;
    dto.cancelledAt = entity.cancelledAt ? new Date(entity.cancelledAt).toISOString() : null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();

    if (entity.allocations) {
      dto.allocations = entity.allocations.map((a) => {
        const ad = new PaymentAllocationResponseDto();
        ad.id = a.id;
        ad.invoiceId = a.invoiceId;
        ad.invoiceNumber = a.invoice?.number;
        ad.amount = PaymentPresenter.toNum(a.amount);
        ad.createdAt = a.createdAt.toISOString();
        return ad;
      });
    }

    return dto;
  }
}
