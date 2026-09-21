import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { InvoiceReversalIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Cancelling an invoice negates its original movements at their recorded cost, keeping averageCost exact. */
@Injectable()
export class InvoiceReversalPolicy {
    async *drafts(tx: PrismaTransactionClient, intent: InvoiceReversalIntent): AsyncGenerator<MovementLineDraft> {
        const originals = await tx.stockMovement.findMany({
            where: { tenantId: intent.tenantId, referenceType: 'invoice', referenceId: intent.invoiceId },
        });
        for (const mv of originals) {
            yield {
                warehouseId: mv.warehouseId,
                itemId: mv.itemId,
                movementType: StockMovementType.ADJUSTMENT,
                quantity: -Number(mv.quantity),
                unitCost: Number(mv.unitCost),
                referenceType: 'invoice_cancellation',
                referenceId: intent.invoiceId,
                notes: `Cancellation of invoice ${intent.invoiceNumber}`,
            };
        }
    }
}
