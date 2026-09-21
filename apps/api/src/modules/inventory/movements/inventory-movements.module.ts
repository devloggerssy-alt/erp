import { Module } from '@nestjs/common';
import { InventoryMovementFacade } from './inventory-movement.facade';
import { MovementPolicyRegistry } from './movement-policy.registry';
import { StockMovementWriter } from './stock-movement.writer';
import { PurchaseReceiptPolicy } from './policies/purchase-receipt.policy';
import { SaleIssuePolicy } from './policies/sale-issue.policy';
import { InvoiceReversalPolicy } from './policies/invoice-reversal.policy';
import { StockCountVariancePolicy } from './policies/stock-count-variance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';

@Module({
    providers: [
        InventoryMovementFacade,
        MovementPolicyRegistry,
        StockMovementWriter,
        PurchaseReceiptPolicy,
        SaleIssuePolicy,
        InvoiceReversalPolicy,
        StockCountVariancePolicy,
        OpeningStockPolicy,
    ],
    exports: [InventoryMovementFacade],
})
export class InventoryMovementsModule {}
