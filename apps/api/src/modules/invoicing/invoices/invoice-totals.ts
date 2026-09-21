import type { InvoiceLineDto } from './dto';

/**
 * Server-side invoice pricing: per line, discount then tax on the discounted
 * amount; document totals are the sums. Shared by InvoicesService.create and
 * .update so the two paths cannot drift (Phase 5.4.1).
 */
export function computeInvoiceTotals(tenantId: string, lines: InvoiceLineDto[]) {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const lineRows = lines.map((line, index) => {
        const lineSubtotal = line.quantity * line.unitPrice;
        const discountPercent = line.discountPercent || 0;
        const lineDiscount = lineSubtotal * (discountPercent / 100);
        const afterDiscount = lineSubtotal - lineDiscount;
        const taxPercent = line.taxPercent || 0;
        const lineTax = afterDiscount * (taxPercent / 100);

        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        taxAmount += lineTax;

        return {
            tenantId,
            itemId: line.itemId,
            unitId: line.unitId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent || 0,
            discountAmount: lineDiscount,
            taxPercent: line.taxPercent || 0,
            taxAmount: lineTax,
            total: afterDiscount + lineTax,
            notes: line.notes,
            sortOrder: line.sortOrder ?? index,
        };
    });

    return { lines: lineRows, subtotal, discountAmount, taxAmount, total: subtotal - discountAmount + taxAmount };
}
