import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../accounting/posting';
import type { MovementIntent } from './contracts/movement-intent';
import type { MovementLineDraft } from './contracts/movement-line-draft';
import { PurchaseReceiptPolicy } from './policies/purchase-receipt.policy';
import { SaleIssuePolicy } from './policies/sale-issue.policy';
import { InvoiceReversalPolicy } from './policies/invoice-reversal.policy';
import { StockCountVariancePolicy } from './policies/stock-count-variance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';

export type MovementDraftSource = Iterable<MovementLineDraft> | AsyncIterable<MovementLineDraft>;

function assertNever(value: never): never {
    throw new Error(`Unhandled movement intent kind: ${JSON.stringify(value)}`);
}

/**
 * kind -> policy dispatch, exhaustively checked via assertNever so a new
 * MovementIntent member without a case is a compile error (same contract as
 * accounting's PostingPolicyRegistry).
 */
@Injectable()
export class MovementPolicyRegistry {
    constructor(
        private readonly purchaseReceipt: PurchaseReceiptPolicy,
        private readonly saleIssue: SaleIssuePolicy,
        private readonly invoiceReversal: InvoiceReversalPolicy,
        private readonly stockCountVariance: StockCountVariancePolicy,
        private readonly openingStock: OpeningStockPolicy,
    ) {}

    drafts(tx: PrismaTransactionClient, intent: MovementIntent): MovementDraftSource {
        switch (intent.kind) {
            case 'PURCHASE_RECEIPT':
                return this.purchaseReceipt.drafts(tx, intent);
            case 'SALE_ISSUE':
                return this.saleIssue.drafts(tx, intent);
            case 'INVOICE_REVERSAL':
                return this.invoiceReversal.drafts(tx, intent);
            case 'STOCK_COUNT_VARIANCE':
                return this.stockCountVariance.drafts(tx, intent);
            case 'OPENING_STOCK':
                return this.openingStock.drafts(tx, intent);
            default:
                return assertNever(intent);
        }
    }
}
