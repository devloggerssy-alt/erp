import { BadRequestException, Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { SaleIssueIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/**
 * Goods leaving on a posted sales invoice. Each line is checked for
 * availability and valued at averageCost *when it is pulled*, after earlier
 * lines have been persisted — so two lines for the same item compete for the
 * same stock, exactly as before the port.
 */
@Injectable()
export class SaleIssuePolicy {
    async *drafts(tx: PrismaTransactionClient, intent: SaleIssueIntent): AsyncGenerator<MovementLineDraft> {
        for (const line of intent.lines) {
            const balance = await tx.stockBalance.findUnique({
                where: { tenantId_warehouseId_itemId: { tenantId: intent.tenantId, warehouseId: intent.warehouseId, itemId: line.itemId } },
            });
            const currentQty = balance ? Number(balance.quantity) : 0;
            if (currentQty < line.quantity) {
                throw new BadRequestException(
                    `Insufficient stock for item "${line.itemId}". Available: ${currentQty}, Requested: ${line.quantity}`,
                );
            }
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.SALE,
                quantity: -line.quantity,
                unitCost: balance ? Number(balance.averageCost) : line.fallbackUnitCost,
                referenceType: 'invoice',
                referenceId: intent.invoiceId,
            };
        }
    }
}
