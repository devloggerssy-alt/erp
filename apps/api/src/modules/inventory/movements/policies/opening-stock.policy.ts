import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { OpeningStockIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Initial quantities at a known unit cost; the GL side is posted separately by InventoryService. */
@Injectable()
export class OpeningStockPolicy {
    *drafts(_tx: PrismaTransactionClient, intent: OpeningStockIntent): Generator<MovementLineDraft> {
        for (const line of intent.lines) {
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.OPENING,
                quantity: line.quantity,
                unitCost: line.unitCost,
                notes: 'Opening Balance Registration',
            };
        }
    }
}
