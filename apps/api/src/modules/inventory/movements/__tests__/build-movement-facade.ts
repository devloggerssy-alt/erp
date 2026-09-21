import { InventoryMovementFacade } from '../inventory-movement.facade';
import { MovementPolicyRegistry } from '../movement-policy.registry';
import { StockMovementWriter } from '../stock-movement.writer';
import { PurchaseReceiptPolicy } from '../policies/purchase-receipt.policy';
import { SaleIssuePolicy } from '../policies/sale-issue.policy';
import { InvoiceReversalPolicy } from '../policies/invoice-reversal.policy';
import { StockCountVariancePolicy } from '../policies/stock-count-variance.policy';
import { OpeningStockPolicy } from '../policies/opening-stock.policy';

/** A real facade wired by hand — the same graph InventoryMovementsModule builds. */
export function buildMovementFacade(): InventoryMovementFacade {
    const registry = new MovementPolicyRegistry(
        new PurchaseReceiptPolicy(),
        new SaleIssuePolicy(),
        new InvoiceReversalPolicy(),
        new StockCountVariancePolicy(),
        new OpeningStockPolicy(),
    );
    return new InventoryMovementFacade(registry, new StockMovementWriter());
}
