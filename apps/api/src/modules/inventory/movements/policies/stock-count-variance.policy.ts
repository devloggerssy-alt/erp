import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { StockCountVarianceIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Counted-vs-system differences, valued at averageCost (0 for an item with no balance yet). */
@Injectable()
export class StockCountVariancePolicy {
    async *drafts(tx: PrismaTransactionClient, intent: StockCountVarianceIntent): AsyncGenerator<MovementLineDraft> {
        for (const line of intent.lines) {
            const balance = await tx.stockBalance.findUnique({
                where: { tenantId_warehouseId_itemId: { tenantId: intent.tenantId, warehouseId: intent.warehouseId, itemId: line.itemId } },
            });
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.STOCK_COUNT,
                quantity: line.difference,
                unitCost: balance ? Number(balance.averageCost) : 0,
                referenceType: 'stock_count',
                referenceId: intent.stockCountId,
                notes: `Stock count adjustment: ${intent.stockCountNumber}`,
            };
        }
    }
}
