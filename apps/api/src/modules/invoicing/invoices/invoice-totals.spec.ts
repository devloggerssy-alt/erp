import { computeInvoiceTotals } from './invoice-totals';

describe('computeInvoiceTotals', () => {
    const lines = [
        { itemId: 'i1', unitId: 'u1', quantity: 3, unitPrice: 10, discountPercent: 10, taxPercent: 5, notes: 'n', sortOrder: 7 },
        { itemId: 'i2', unitId: 'u1', quantity: 1, unitPrice: 20 },
    ];

    it('applies discount before tax per line and sums document totals', () => {
        const result = computeInvoiceTotals('t1', lines);

        // line 1: 30 − 3 discount = 27, + 1.35 tax = 28.35; line 2: 20
        expect(result.lines[0]?.discountAmount).toBeCloseTo(3, 10);
        expect(result.lines[0]?.taxAmount).toBeCloseTo(1.35, 10);
        expect(result.lines[0]?.total).toBeCloseTo(28.35, 10);
        expect(result.lines[1]?.total).toBe(20);
        expect(result.subtotal).toBe(50);
        expect(result.discountAmount).toBeCloseTo(3, 10);
        expect(result.taxAmount).toBeCloseTo(1.35, 10);
        expect(result.total).toBe(result.subtotal - result.discountAmount + result.taxAmount);
    });

    it('builds line rows with tenant, defaults and sort order', () => {
        const result = computeInvoiceTotals('t1', lines);

        expect(result.lines[0]).toEqual(expect.objectContaining({
            tenantId: 't1', itemId: 'i1', unitId: 'u1', quantity: 3, unitPrice: 10,
            discountPercent: 10, taxPercent: 5, notes: 'n', sortOrder: 7,
        }));
        expect(result.lines[1]).toEqual(expect.objectContaining({
            tenantId: 't1', itemId: 'i2', discountPercent: 0, taxPercent: 0, discountAmount: 0, taxAmount: 0, sortOrder: 1,
        }));
    });
});
