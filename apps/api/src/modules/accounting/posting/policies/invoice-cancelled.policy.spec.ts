import { ReferenceType } from '@devloggers/db-prisma';
import { InvoiceCancelledPolicy } from './invoice-cancelled.policy';

describe('InvoiceCancelledPolicy', () => {
    it('names the INVOICE_CANCELLATION reference type', () => {
        expect(new InvoiceCancelledPolicy().referenceType).toBe(ReferenceType.INVOICE_CANCELLATION);
    });
});
