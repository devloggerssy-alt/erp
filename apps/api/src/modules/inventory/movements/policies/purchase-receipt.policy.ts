import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { PurchaseReceiptIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Goods received on a posted purchase invoice, at the invoice-derived net cost. */
@Injectable()
export class PurchaseReceiptPolicy {
    *drafts(_tx: PrismaTransactionClient, intent: PurchaseReceiptIntent): Generator<MovementLineDraft> {
        for (const line of intent.lines) {
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.PURCHASE,
                quantity: line.quantity,
                unitCost: line.unitCost,
                referenceType: 'invoice',
                referenceId: intent.invoiceId,
            };
        }
    }
}
