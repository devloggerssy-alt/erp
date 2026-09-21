import { Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import type { JournalLineDraft } from './contracts/journal-line-draft';
import type { PrismaTransactionClient } from './contracts/prisma-tx';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';
import { OpeningSessionPostedPolicy } from './policies/opening-session.policy';

function assertNever(value: never): never {
    throw new Error(`Unhandled posting intent kind: ${JSON.stringify(value)}`);
}

/**
 * kind -> policy dispatch table, exhaustively checked via `assertNever` so a
 * new PostingIntent member without a matching case is a compile error, not a
 * runtime surprise (spec task 1.3.4).
 */
@Injectable()
export class PostingPolicyRegistry {
    constructor(
        private readonly invoicePosted: InvoicePostedPolicy,
        private readonly paymentRecorded: PaymentRecordedPolicy,
        private readonly expenseRecorded: ExpenseRecordedPolicy,
        private readonly stockCountAdjusted: StockCountAdjustedPolicy,
        private readonly openingStock: OpeningStockPolicy,
        private readonly openingSession: OpeningSessionPostedPolicy,
        private readonly invoiceCancelled: InvoiceCancelledPolicy,
        private readonly paymentCancelled: PaymentCancelledPolicy,
        private readonly expenseCancelled: ExpenseCancelledPolicy,
    ) {}

    resolvePosting(intent: PostingRecordIntent): {
        referenceType: ReferenceType;
        buildLines: (tx: PrismaTransactionClient) => Promise<JournalLineDraft[]>;
    } {
        switch (intent.kind) {
            case 'INVOICE_POSTED':
                return { referenceType: ReferenceType.INVOICE, buildLines: (tx) => this.invoicePosted.buildLines(tx, intent) };
            case 'PAYMENT_RECORDED':
                return { referenceType: ReferenceType.PAYMENT, buildLines: (tx) => this.paymentRecorded.buildLines(tx, intent) };
            case 'EXPENSE_RECORDED':
                return { referenceType: ReferenceType.EXPENSE, buildLines: () => this.expenseRecorded.buildLines(intent) };
            case 'STOCK_COUNT_ADJUSTED':
                return { referenceType: ReferenceType.STOCK_COUNT, buildLines: () => this.stockCountAdjusted.buildLines(intent) };
            case 'OPENING_STOCK_POSTED':
                return { referenceType: ReferenceType.OPENING_BALANCE, buildLines: () => this.openingStock.buildLines(intent) };
            case 'OPENING_SESSION_POSTED':
                return { referenceType: ReferenceType.OPENING_BALANCE, buildLines: (tx) => this.openingSession.buildLines(tx, intent) };
            default:
                return assertNever(intent);
        }
    }

    /** Reversal always mirrors the original entry's lines — no line-builder needed, only the referenceType. */
    resolveReversal(intent: PostingCancellationIntent): { referenceType: ReferenceType } {
        switch (intent.kind) {
            case 'INVOICE_CANCELLED':
                return { referenceType: this.invoiceCancelled.referenceType };
            case 'PAYMENT_CANCELLED':
                return { referenceType: this.paymentCancelled.referenceType };
            case 'EXPENSE_CANCELLED':
                return { referenceType: this.expenseCancelled.referenceType };
            default:
                return assertNever(intent);
        }
    }
}
