/**
 * Public API of the inventory domain. Other domains import from
 * 'modules/inventory' only — deep imports are lint errors (Phase 5.2).
 * Files inside inventory must NOT import this barrel (use relative paths)
 * to avoid module-evaluation cycles.
 */
export { InventoryModule } from './inventory.module';
export { InventoryService } from './inventory.service';
export { InventoryMovementFacade, InventoryMovementsModule } from './movements';
export type {
    MovementIntent,
    MovementResult,
    PurchaseReceiptIntent,
    SaleIssueIntent,
    InvoiceReversalIntent,
    StockCountVarianceIntent,
    OpeningStockIntent,
} from './movements';
