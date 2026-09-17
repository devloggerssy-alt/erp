import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../accounting/posting';
import type { MovementHeader, MovementLineDraft } from './contracts/movement-line-draft';

/**
 * Persistence step of the movement port: appends one StockMovement and keeps
 * the StockBalance cache in step (weighted-average cost on inflows; outflows
 * leave averageCost unchanged). Internal to inventory/movements — reach it
 * through InventoryMovementFacade.
 */
@Injectable()
export class StockMovementWriter {
    async write(tx: PrismaTransactionClient, header: MovementHeader, draft: MovementLineDraft): Promise<{ id: string }> {
        const movement = await tx.stockMovement.create({
            data: {
                tenantId: header.tenantId,
                warehouseId: draft.warehouseId,
                itemId: draft.itemId,
                fiscalPeriodId: header.fiscalPeriodId,
                movementType: draft.movementType,
                quantity: draft.quantity,
                unitCost: draft.unitCost,
                referenceType: draft.referenceType,
                referenceId: draft.referenceId,
                notes: draft.notes,
                createdBy: header.userId,
            },
        });

        const balance = await tx.stockBalance.findUnique({
            where: {
                tenantId_warehouseId_itemId: {
                    tenantId: header.tenantId,
                    warehouseId: draft.warehouseId,
                    itemId: draft.itemId,
                },
            },
        });

        if (!balance) {
            await tx.stockBalance.create({
                data: {
                    tenantId: header.tenantId,
                    warehouseId: draft.warehouseId,
                    itemId: draft.itemId,
                    quantity: draft.quantity,
                    averageCost: draft.unitCost,
                },
            });
        } else {
            const newQuantity = Number(balance.quantity) + draft.quantity;
            let newAverageCost = Number(balance.averageCost);
            if (draft.quantity > 0) {
                const totalValue = (Number(balance.quantity) * Number(balance.averageCost)) + (draft.quantity * draft.unitCost);
                newAverageCost = totalValue / newQuantity;
            }
            await tx.stockBalance.update({
                where: { id: balance.id },
                data: { quantity: newQuantity, averageCost: newAverageCost },
            });
        }

        return { id: movement.id };
    }
}
