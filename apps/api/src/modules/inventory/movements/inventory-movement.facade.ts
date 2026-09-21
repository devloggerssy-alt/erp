import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../accounting/posting';
import type { MovementIntent, MovementResult } from './contracts/movement-intent';
import { MovementPolicyRegistry } from './movement-policy.registry';
import { StockMovementWriter } from './stock-movement.writer';

/**
 * The single entry point other modules use to move stock. Runs inside the
 * caller's transaction so stock, GL and document status commit atomically.
 *
 * Each draft is persisted before the next is pulled from the policy: policies
 * read StockBalance lazily, so a later line always sees the earlier lines'
 * effect (availability and averageCost), matching pre-port behavior.
 */
@Injectable()
export class InventoryMovementFacade {
    constructor(
        private readonly registry: MovementPolicyRegistry,
        private readonly writer: StockMovementWriter,
    ) {}

    async apply(tx: PrismaTransactionClient, intent: MovementIntent): Promise<MovementResult> {
        const header = { tenantId: intent.tenantId, userId: intent.userId, fiscalPeriodId: intent.fiscalPeriodId };
        const movementIds: string[] = [];
        let valueDelta = 0;

        for await (const draft of this.registry.drafts(tx, intent)) {
            const { id } = await this.writer.write(tx, header, draft);
            movementIds.push(id);
            valueDelta += draft.quantity * draft.unitCost;
        }

        return { movementIds, valueDelta };
    }
}
