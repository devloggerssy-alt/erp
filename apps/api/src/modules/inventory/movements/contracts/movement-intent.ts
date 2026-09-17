/**
 * Discriminated union of every stock event another module can report to
 * InventoryMovementFacade — the inventory counterpart of accounting's
 * PostingIntent. Fields describe *what happened* (which items, how many, at
 * what known cost). Everything that needs current stock state — availability
 * checks, average-cost valuation, finding the movements to reverse — is
 * resolved by the matching policy inside the caller's transaction, never by
 * the caller.
 */
export interface MovementIntentBase {
    tenantId: string;
    userId: string;
    fiscalPeriodId: string;
}

export interface PurchaseReceiptIntent extends MovementIntentBase {
    kind: 'PURCHASE_RECEIPT';
    warehouseId: string;
    invoiceId: string;
    /** unitCost is base currency, net of tax and discount, computed by the caller from the invoice line. */
    lines: { itemId: string; quantity: number; unitCost: number }[];
}

export interface SaleIssueIntent extends MovementIntentBase {
    kind: 'SALE_ISSUE';
    warehouseId: string;
    invoiceId: string;
    /**
     * quantity is the positive amount leaving stock. Lines are valued at the
     * balance's averageCost; fallbackUnitCost applies only when no balance row
     * exists (reachable only for zero-quantity lines, since availability is checked first).
     */
    lines: { itemId: string; quantity: number; fallbackUnitCost: number }[];
}

export interface InvoiceReversalIntent extends MovementIntentBase {
    kind: 'INVOICE_REVERSAL';
    invoiceId: string;
    /** Used only in the movement notes. */
    invoiceNumber: string;
}

export interface StockCountVarianceIntent extends MovementIntentBase {
    kind: 'STOCK_COUNT_VARIANCE';
    warehouseId: string;
    stockCountId: string;
    stockCountNumber: string;
    /** Signed counted − system difference. The caller passes only non-zero, non-service lines. */
    lines: { itemId: string; difference: number }[];
}

export interface OpeningStockIntent extends MovementIntentBase {
    kind: 'OPENING_STOCK';
    warehouseId: string;
    lines: { itemId: string; quantity: number; unitCost: number }[];
}

export type MovementIntent =
    | PurchaseReceiptIntent
    | SaleIssueIntent
    | InvoiceReversalIntent
    | StockCountVarianceIntent
    | OpeningStockIntent;

export interface MovementResult {
    movementIds: string[];
    /**
     * Σ(quantity × unitCost) over the persisted movements, in base currency,
     * accumulated in line order. Negative for issues: a sale's COGS is
     * Math.abs(valueDelta); a stock count's net variance is valueDelta itself.
     */
    valueDelta: number;
}
