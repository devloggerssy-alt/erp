import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import { InvoiceResponseDto, InvoiceLineResponseDto, InvoicePaymentResponseDto, InvoicePaidStatus } from '../dto/invoice.dto';

type Decimal = { toNumber(): number } | number;
const toNum = (d: Decimal | null | undefined) => {
    if (d == null) return 0;
    return typeof d === 'object' ? d.toNumber() : d;
};

/**
 * Derives paid state from an invoice's total and its allocated `PaymentAllocation` rows.
 * Shared with `ReportsService.getPartyStatement()` so the two never disagree on "paid."
 */
export function computeInvoicePaidState(
    total: Decimal | null | undefined,
    allocations: Array<{ amount: Decimal }> | null | undefined,
): { amountPaid: number; balanceDue: number; paidStatus: InvoicePaidStatus } {
    const totalNum = toNum(total);
    const amountPaid = (allocations ?? []).reduce((sum, a) => sum + toNum(a.amount), 0);
    const balanceDue = totalNum - amountPaid;
    const paidStatus = amountPaid <= 0
        ? InvoicePaidStatus.UNPAID
        : amountPaid >= totalNum
            ? InvoicePaidStatus.PAID
            : InvoicePaidStatus.PARTIAL;

    return { amountPaid, balanceDue, paidStatus };
}

@Injectable()
export class InvoicePresenter {
    constructor(private readonly locale: LocaleResolverService) {}

    toListResponse(entity: any): InvoiceResponseDto {
        const { amountPaid, balanceDue, paidStatus } = computeInvoicePaidState(entity.total, entity.paymentAllocations);
        return {
            id: entity.id,
            number: entity.number,
            invoiceTypeId: entity.invoiceTypeId,
            // invoiceType.name is a LocalizedString ({ ar, en }) — resolve to the request locale.
            invoiceTypeName: entity.invoiceType?.name
                ? this.locale.resolve(entity.invoiceType.name as LocalizedString)
                : undefined,
            invoiceTypeDirection: entity.invoiceType?.direction,
            date: entity.date instanceof Date ? entity.date.toISOString() : String(entity.date),
            dueDate: entity.dueDate ? new Date(entity.dueDate).toISOString() : null,
            partyId: entity.partyId,
            partyName: entity.party?.name,
            partyAddress: entity.party?.address ?? null,
            partyPhone: entity.party?.phone ?? null,
            partyEmail: entity.party?.email ?? null,
            warehouseId: entity.warehouseId ?? null,
            warehouseName: entity.warehouse?.name,
            fiscalPeriodId: entity.fiscalPeriodId,
            currencyId: entity.currencyId,
            currencyCode: entity.currency?.code,
            // currency.symbol is a LocalizedString ({ ar, en }) — resolve to the request locale.
            currencySymbol: entity.currency?.symbol
                ? this.locale.resolve(entity.currency.symbol as LocalizedString)
                : undefined,
            exchangeRate: toNum(entity.exchangeRate),
            status: entity.status,
            subtotal: toNum(entity.subtotal),
            discountAmount: toNum(entity.discountAmount),
            taxAmount: toNum(entity.taxAmount),
            total: toNum(entity.total),
            notes: entity.notes ?? null,
            postedAt: entity.postedAt ? new Date(entity.postedAt).toISOString() : null,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
            lineCount: entity._count?.lines,
            amountPaid,
            balanceDue,
            paidStatus,
        };
    }

    toDetailResponse(entity: any): InvoiceResponseDto {
        const lines: InvoiceLineResponseDto[] = (entity.lines ?? []).map((line: any) => ({
            id: line.id,
            itemId: line.itemId,
            itemName: line.item?.name,
            itemCode: line.item?.code,
            unitId: line.unitId,
            unitName: line.unit?.name,
            unitAbbreviation: line.unit?.abbreviation,
            quantity: toNum(line.quantity),
            unitPrice: toNum(line.unitPrice),
            discountPercent: toNum(line.discountPercent),
            discountAmount: toNum(line.discountAmount),
            taxPercent: toNum(line.taxPercent),
            taxAmount: toNum(line.taxAmount),
            total: toNum(line.total),
            notes: line.notes ?? null,
            sortOrder: line.sortOrder,
        }));

        const payments: InvoicePaymentResponseDto[] = (entity.paymentAllocations ?? []).map((allocation: any) => ({
            id: allocation.id,
            paymentId: allocation.paymentId,
            paymentNumber: allocation.payment?.number ?? '',
            amount: toNum(allocation.amount),
            date: allocation.payment?.date ? new Date(allocation.payment.date).toISOString() : '',
            createdAt: allocation.createdAt.toISOString(),
        }));

        return { ...this.toListResponse(entity), lines, payments };
    }

    toListResponseList(entities: any[]): InvoiceResponseDto[] {
        return entities.map((e) => this.toListResponse(e));
    }
}
