import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { Payment } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { PaymentResponseDto, PaymentAllocationResponseDto } from '../dto/payment-response.dto';
import type { PaymentDetail, PaymentListItem } from '../repositories/payments.repository';

/** A plain row (create path), a list row, or a detail row. Relations exist only on the loaded shapes. */
export type PaymentEntity = Payment | PaymentListItem | PaymentDetail;

@Injectable()
export class PaymentPresenter extends CrudPresenter<PaymentEntity, PaymentResponseDto> {
  constructor(private readonly locale: LocaleResolverService) {
    super();
  }

  toResponse(entity: PaymentEntity): PaymentResponseDto {
    const cashbox = 'cashbox' in entity ? entity.cashbox : undefined;
    const party = 'party' in entity ? entity.party : undefined;
    const branch = 'branch' in entity ? entity.branch : undefined;
    const currency = 'currency' in entity ? entity.currency : undefined;
    const allocations = 'allocations' in entity ? entity.allocations : undefined;

    const dto = new PaymentResponseDto();
    dto.id = entity.id;
    dto.number = entity.number;
    dto.type = entity.type;
    dto.date = entity.date instanceof Date ? entity.date.toISOString() : String(entity.date);
    dto.status = entity.status;
    dto.cashboxId = entity.cashboxId;
    // cashbox.name is a LocalizedString ({ ar, en }) — resolve to the request locale.
    const cashboxName = toLocalizedString(cashbox?.name);
    dto.cashboxName = cashboxName ? this.locale.resolve(cashboxName) : undefined;
    dto.cashboxCode = cashbox?.code;
    dto.branchId = entity.branchId ?? null;
    dto.branchCode = branch?.code;
    // branch.name is a LocalizedString ({ ar, en }) — resolve to the request locale.
    const branchName = toLocalizedString(branch?.name);
    dto.branchName = branchName ? this.locale.resolve(branchName) : undefined;
    dto.partyId = entity.partyId ?? null;
    dto.partyName = party?.name;
    dto.currencyId = entity.currencyId;
    dto.currencyCode = currency?.code;
    // currency.symbol is a LocalizedString ({ ar, en }) — resolve to the request locale.
    const currencySymbol = toLocalizedString(currency?.symbol);
    dto.currencySymbol = currencySymbol ? this.locale.resolve(currencySymbol) : undefined;
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

    if (allocations) {
      dto.allocations = allocations.map((a) => {
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
