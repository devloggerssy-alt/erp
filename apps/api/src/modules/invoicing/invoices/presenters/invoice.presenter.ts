import { Injectable } from '@nestjs/common';
import { InvoiceResponseDto, InvoiceLineResponseDto } from '../dto/invoice.dto';

type Decimal = { toNumber(): number } | number;
const toNum = (d: Decimal | null | undefined) => {
    if (d == null) return 0;
    return typeof d === 'object' ? d.toNumber() : d;
};

@Injectable()
export class InvoicePresenter {
    toListResponse(entity: any): InvoiceResponseDto {
        return {
            id: entity.id,
            number: entity.number,
            invoiceTypeId: entity.invoiceTypeId,
            invoiceTypeName: entity.invoiceType?.name,
            invoiceTypeDirection: entity.invoiceType?.direction,
            date: entity.date instanceof Date ? entity.date.toISOString() : String(entity.date),
            dueDate: entity.dueDate ? new Date(entity.dueDate).toISOString() : null,
            partyId: entity.partyId,
            partyName: entity.party?.name,
            warehouseId: entity.warehouseId ?? null,
            warehouseName: entity.warehouse?.name,
            fiscalPeriodId: entity.fiscalPeriodId,
            currencyId: entity.currencyId,
            currencyCode: entity.currency?.code,
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

        return { ...this.toListResponse(entity), lines };
    }

    toListResponseList(entities: any[]): InvoiceResponseDto[] {
        return entities.map((e) => this.toListResponse(e));
    }
}
