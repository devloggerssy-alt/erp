import { ReferenceType } from '@devloggers/db-prisma';
import { PostingPolicyRegistry } from './posting-policy.registry';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningBalancePolicy } from './policies/opening-balance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';

function buildRegistry() {
    const fs = { getOrThrow: jest.fn().mockResolvedValue({}) } as any;
    return new PostingPolicyRegistry(
        new InvoicePostedPolicy(fs),
        new PaymentRecordedPolicy(fs),
        new ExpenseRecordedPolicy(),
        new StockCountAdjustedPolicy(fs),
        new OpeningBalancePolicy(fs),
        new OpeningStockPolicy(fs),
        new InvoiceCancelledPolicy(),
        new PaymentCancelledPolicy(),
        new ExpenseCancelledPolicy(),
    );
}

const RECORD_CASES: [PostingRecordIntent['kind'], ReferenceType][] = [
    ['INVOICE_POSTED', ReferenceType.INVOICE],
    ['PAYMENT_RECORDED', ReferenceType.PAYMENT],
    ['EXPENSE_RECORDED', ReferenceType.EXPENSE],
    ['STOCK_COUNT_ADJUSTED', ReferenceType.STOCK_COUNT],
    ['OPENING_BALANCE_POSTED', ReferenceType.OPENING_BALANCE],
    ['OPENING_STOCK_POSTED', ReferenceType.OPENING_BALANCE],
];

describe('PostingPolicyRegistry.resolvePosting', () => {
    it.each(RECORD_CASES)('%s resolves to %s', (kind, expected) => {
        const { referenceType } = buildRegistry().resolvePosting({ kind } as PostingRecordIntent);
        expect(referenceType).toBe(expected);
    });
});

const REVERSAL_CASES: [PostingCancellationIntent['kind'], ReferenceType][] = [
    ['INVOICE_CANCELLED', ReferenceType.INVOICE_CANCELLATION],
    ['PAYMENT_CANCELLED', ReferenceType.PAYMENT_CANCELLATION],
    ['EXPENSE_CANCELLED', ReferenceType.EXPENSE_CANCELLATION],
];

describe('PostingPolicyRegistry.resolveReversal', () => {
    it.each(REVERSAL_CASES)('%s resolves to %s', (kind, expected) => {
        const { referenceType } = buildRegistry().resolveReversal({ kind } as PostingCancellationIntent);
        expect(referenceType).toBe(expected);
    });
});
