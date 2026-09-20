import { OutboxRepository } from './outbox.repository';
import type { ClaimedOutboxEvent } from './outbox.types';

interface RowLike {
    id: string;
    tenantId: string;
    topic: string;
    payload: unknown;
    attempts: number;
    maxAttempts: number;
}

function createDouble(rows: RowLike[] = []) {
    const outboxEvent = {
        create: jest.fn().mockResolvedValue({ id: 'ob-1' }),
        findMany: jest.fn().mockResolvedValue(rows),
        updateMany: jest.fn().mockResolvedValue({ count: rows.length }),
        update: jest.fn().mockResolvedValue(undefined),
    };
    const tx = { outboxEvent };
    const prisma = { outboxEvent, $transaction: jest.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(tx)) };
    return { repository: new OutboxRepository(prisma as never), outboxEvent, tx };
}

const row: RowLike = {
    id: 'ob-1',
    tenantId: 't1',
    topic: 'accounting.journal-posted',
    payload: { journalEntryId: 'je-1' },
    attempts: 0,
    maxAttempts: 5,
};

describe('OutboxRepository', () => {
    it('enqueues inside the caller transaction with the default max attempts', async () => {
        const { repository, outboxEvent, tx } = createDouble();

        await expect(
            repository.enqueue(tx as never, { tenantId: 't1', topic: 'accounting.journal-posted', payload: { a: 1 } }),
        ).resolves.toEqual({ id: 'ob-1' });

        expect(outboxEvent.create).toHaveBeenCalledWith({
            data: { tenantId: 't1', topic: 'accounting.journal-posted', payload: { a: 1 }, maxAttempts: 5 },
            select: { id: true },
        });
    });

    it('honours a maxAttempts override', async () => {
        const { repository, outboxEvent, tx } = createDouble();
        await repository.enqueue(tx as never, { tenantId: 't1', topic: 'x', payload: {}, maxAttempts: 2 });
        expect(outboxEvent.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ maxAttempts: 2 }) }),
        );
    });

    it('claims pending rows and marks them PROCESSING', async () => {
        const { repository, outboxEvent } = createDouble([row]);

        const claimed = await repository.claimPending(20);

        expect(claimed).toEqual<ClaimedOutboxEvent[]>([
            {
                id: 'ob-1',
                tenantId: 't1',
                topic: 'accounting.journal-posted',
                payload: { journalEntryId: 'je-1' },
                attempts: 0,
                maxAttempts: 5,
            },
        ]);
        expect(outboxEvent.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['ob-1'] } },
            data: { status: 'PROCESSING', lockedAt: expect.any(Date) },
        });
    });

    it('does not write when there is nothing to claim', async () => {
        const { repository, outboxEvent } = createDouble([]);
        await expect(repository.claimPending(20)).resolves.toEqual([]);
        expect(outboxEvent.updateMany).not.toHaveBeenCalled();
    });

    it('marks a delivery as delivered', async () => {
        const { repository, outboxEvent } = createDouble();
        await repository.markDelivered('ob-1');
        expect(outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 'ob-1' },
            data: { status: 'DELIVERED', deliveredAt: expect.any(Date), lastError: null },
        });
    });

    it('schedules a retry with backoff', async () => {
        const { repository, outboxEvent } = createDouble();
        await repository.markFailed('ob-1', 'boom', true, 5000);
        expect(outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 'ob-1' },
            data: {
                status: 'PENDING',
                attempts: { increment: 1 },
                availableAt: expect.any(Date),
                lastError: 'boom',
            },
        });
    });

    it('dead-letters when no attempts are left', async () => {
        const { repository, outboxEvent } = createDouble();
        await repository.markFailed('ob-1', 'boom', false, 5000);
        expect(outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 'ob-1' },
            data: { status: 'DEAD', attempts: { increment: 1 }, lastError: 'boom' },
        });
    });
});
