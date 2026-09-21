import type { PrismaTransactionClient } from '../../../accounting/posting';

export interface FakeBalance {
    id: string;
    tenantId: string;
    warehouseId: string;
    itemId: string;
    quantity: number;
    averageCost: number;
}

export interface FakeMovement {
    id: string;
    tenantId: string;
    warehouseId: string;
    itemId: string;
    fiscalPeriodId: string;
    movementType: string;
    quantity: number;
    unitCost: number;
    referenceType?: string | null;
    referenceId?: string | null;
    notes?: string | null;
    createdBy: string;
}

interface BalanceKey {
    tenantId: string;
    warehouseId: string;
    itemId: string;
}

/**
 * In-memory stand-in for the slice of Prisma.TransactionClient that stock
 * posting touches. Stateful on purpose: a balance written by one movement is
 * visible to the next read, which is what the interleaving tests depend on.
 * Reads return copies so callers cannot mutate stored state by accident.
 */
export function createFakeInventoryTx(
    seed: { balances?: Omit<FakeBalance, 'id'>[]; movements?: Omit<FakeMovement, 'id'>[] } = {},
) {
    let seq = 0;
    const nextId = (prefix: string) => `${prefix}-${++seq}`;
    const balances: FakeBalance[] = (seed.balances ?? []).map((b) => ({ ...b, id: nextId('bal') }));
    const movements: FakeMovement[] = (seed.movements ?? []).map((m) => ({ ...m, id: nextId('seed-mv') }));
    const itemUpdates: { id: string; data: Record<string, unknown> }[] = [];

    const findBalance = (key: BalanceKey) =>
        balances.find((b) => b.tenantId === key.tenantId && b.warehouseId === key.warehouseId && b.itemId === key.itemId) ?? null;

    const tx = {
        stockMovement: {
            create: jest.fn(async ({ data }: { data: Omit<FakeMovement, 'id'> }) => {
                const row = { ...data, id: nextId('mv') };
                movements.push(row);
                return row;
            }),
            findMany: jest.fn(async ({ where }: { where: { tenantId: string; referenceType: string; referenceId: string } }) =>
                movements
                    .filter((m) => m.tenantId === where.tenantId && m.referenceType === where.referenceType && m.referenceId === where.referenceId)
                    .map((m) => ({ ...m })),
            ),
        },
        stockBalance: {
            findUnique: jest.fn(async ({ where }: { where: { tenantId_warehouseId_itemId: BalanceKey } }) => {
                const found = findBalance(where.tenantId_warehouseId_itemId);
                return found ? { ...found } : null;
            }),
            create: jest.fn(async ({ data }: { data: Omit<FakeBalance, 'id'> }) => {
                const row = { ...data, id: nextId('bal') };
                balances.push(row);
                return { ...row };
            }),
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: { quantity: number; averageCost: number } }) => {
                const row = balances.find((b) => b.id === where.id);
                if (!row) throw new Error(`fake tx: no balance with id ${where.id}`);
                Object.assign(row, data);
                return { ...row };
            }),
        },
        item: {
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                itemUpdates.push({ id: where.id, data });
                return { id: where.id };
            }),
        },
        invoice: {
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
        },
        stockCount: {
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data, lines: [] })),
        },
    };

    return {
        tx,
        // The one deliberate cast: this fake implements only the delegates stock posting uses.
        client: tx as unknown as PrismaTransactionClient,
        state: { balances, movements, itemUpdates },
    };
}

/** The persisted fields that define a movement's accounting meaning (ids and createdBy excluded). */
export function movementRows(movements: FakeMovement[]) {
    return movements.map(({ warehouseId, itemId, movementType, quantity, unitCost, referenceType, referenceId, notes }) => ({
        warehouseId, itemId, movementType, quantity, unitCost, referenceType, referenceId, notes,
    }));
}

export function balanceRows(balances: FakeBalance[]) {
    return balances.map(({ warehouseId, itemId, quantity, averageCost }) => ({ warehouseId, itemId, quantity, averageCost }));
}
