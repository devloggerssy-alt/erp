import type { StockMovementType } from '@devloggers/db-prisma';

/** Shared by every movement an intent produces. */
export interface MovementHeader {
    tenantId: string;
    userId: string;
    fiscalPeriodId: string;
}

/** One stock movement a policy wants persisted. quantity is signed: negative leaves stock. */
export interface MovementLineDraft {
    warehouseId: string;
    itemId: string;
    movementType: StockMovementType;
    quantity: number;
    unitCost: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
}
