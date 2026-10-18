import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import { InvoiceResponseDto, InvoiceLineResponseDto, InvoicePaymentResponseDto, InvoicePaidStatus } from '../dto/invoice.dto';
import type { InvoiceDetail, InvoiceListItem, InvoiceWithLines } from '../invoice-includes';

type Decimal = { toNumber(): number } | number;
const toNum = (d: Decimal | null | undefined) => {
    if (d == null) return 0;
    return typeof d === 'object' ? d.toNumber() : d;
};

/** The detail load selects the party's contact columns; the list load does not. */
type PartyContact = { address: string | null; phone: string | null; email: string | null };
function isDetailedParty(party: object): party is PartyContact {
    return 'address' in party;
}

/**
 * Every shape the presenter receives: the list load, the full detail load, and
 * the partial `{ invoiceType, lines }` load returned by create/update/posting.
 * Relations that exist only on some shapes are reached behind `in` guards.
 */
export type InvoiceEntity = InvoiceListItem | InvoiceDetail | InvoiceWithLines;

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

    toListResponse(entity: InvoiceEntity): InvoiceResponseDto {
        const party = 'party' in entity ? entity.party : undefined;
        const partyContact = party && isDetailedParty(party) ? party : undefined;
        const warehouse = 'warehouse' in entity ? entity.warehouse : undefined;
        const currency = 'currency' in entity ? entity.currency : undefined;
        const allocations = 'paymentAllocations' in entity ? entity.paymentAllocations : undefined;

        const { amountPaid, balanceDue, paidStatus } = computeInvoicePaidState(entity.total, allocations);

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
            partyName: party?.name,
            partyAddress: partyContact?.address ?? null,
            partyPhone: partyContact?.phone ?? null,
            partyEmail: partyContact?.email ?? null,
            warehouseId: entity.warehouseId ?? null,
            // warehouse.name is a LocalizedString ({ ar, en }) — resolve to the request locale.
            warehouseName: warehouse?.name
                ? this.locale.resolve(warehouse.name as LocalizedString)
                : undefined,
            fiscalPeriodId: entity.fiscalPeriodId,
            currencyId: entity.currencyId,
            currencyCode: currency?.code,
            // currency.symbol is a LocalizedString ({ ar, en }) — resolve to the request locale.
            currencySymbol: currency?.symbol
                ? this.locale.resolve(currency.symbol as LocalizedString)
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
            lineCount: '_count' in entity ? entity._count.lines : undefined,
            amountPaid,
            balanceDue,
            paidStatus,
        };
    }

    toDetailResponse(entity: InvoiceDetail | InvoiceWithLines): InvoiceResponseDto {
        const lines: InvoiceLineResponseDto[] = entity.lines.map((line) => ({
            id: line.id,
            itemId: line.itemId,
            itemName: 'item' in line ? line.item.name : undefined,
            itemCode: 'item' in line ? line.item.code : undefined,
            unitId: line.unitId,
            // unit.name is a LocalizedString ({ ar, en }); the raw value is emitted unchanged here.
            unitName: 'unit' in line ? (line.unit.name as string) : undefined,
            unitAbbreviation: 'unit' in line ? line.unit.abbreviation : undefined,
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

        const payments: InvoicePaymentResponseDto[] = ('paymentAllocations' in entity ? entity.paymentAllocations : []).map((allocation) => ({
            id: allocation.id,
            paymentId: allocation.paymentId,
            paymentNumber: allocation.payment?.number ?? '',
            amount: toNum(allocation.amount),
            date: allocation.payment?.date ? new Date(allocation.payment.date).toISOString() : '',
            createdAt: allocation.createdAt.toISOString(),
        }));

        return { ...this.toListResponse(entity), lines, payments };
    }

    toListResponseList(entities: InvoiceEntity[]): InvoiceResponseDto[] {
        return entities.map((e) => this.toListResponse(e));
    }
}
