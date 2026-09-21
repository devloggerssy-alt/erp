import { OutboxWorkerService } from './outbox-worker.service';
import { OUTBOX_RETRY_DELAY_MS, type ClaimedOutboxEvent, type OutboxEventHandler } from './outbox.types';

const claimed: ClaimedOutboxEvent = {
    id: 'ob-1',
    tenantId: 't1',
    topic: 'accounting.journal-posted',
    payload: { journalEntryId: 'je-1' },
    attempts: 0,
    maxAttempts: 5,
};

function build(options: { enabled?: boolean; rows?: ClaimedOutboxEvent[]; handler?: OutboxEventHandler }) {
    const repository = {
        claimPending: jest.fn().mockResolvedValue(options.rows ?? []),
        markDelivered: jest.fn().mockResolvedValue(undefined),
        markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const registry = { resolve: jest.fn().mockReturnValue(options.handler) };
    const config = { get: jest.fn().mockReturnValue(options.enabled ? 'true' : 'false') };
    const worker = new OutboxWorkerService(repository as never, registry as never, config as never);
    return { worker, repository, registry };
}

describe('OutboxWorkerService (Phase 8.4.3)', () => {
    it('does not poll while the outbox is disabled (default)', async () => {
        const { worker, repository } = build({ enabled: false, rows: [claimed] });
        await worker.handleInterval();
        expect(repository.claimPending).not.toHaveBeenCalled();
    });

    it('polls when enabled', async () => {
        const { worker, repository } = build({ enabled: true, rows: [] });
        await worker.handleInterval();
        expect(repository.claimPending).toHaveBeenCalled();
    });

    it('delivers a claimed event and marks it delivered', async () => {
        const handler = jest.fn().mockResolvedValue(undefined);
        const { worker, repository, registry } = build({ rows: [claimed], handler });

        await expect(worker.drainOnce()).resolves.toBe(1);

        expect(registry.resolve).toHaveBeenCalledWith('accounting.journal-posted');
        expect(handler).toHaveBeenCalledWith(claimed.payload, {
            eventId: 'ob-1',
            tenantId: 't1',
            topic: 'accounting.journal-posted',
            attempt: 1,
        });
        expect(repository.markDelivered).toHaveBeenCalledWith('ob-1');
        expect(repository.markFailed).not.toHaveBeenCalled();
    });

    it('schedules a retry after a handler failure', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('boom'));
        const { worker, repository } = build({ rows: [claimed], handler });

        await worker.drainOnce();

        expect(repository.markFailed).toHaveBeenCalledWith('ob-1', 'boom', true, OUTBOX_RETRY_DELAY_MS);
    });

    it('dead-letters on the final attempt', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('boom'));
        const { worker, repository } = build({ rows: [{ ...claimed, attempts: 4 }], handler });

        await worker.drainOnce();

        expect(repository.markFailed).toHaveBeenCalledWith('ob-1', 'boom', false, OUTBOX_RETRY_DELAY_MS);
    });

    it('dead-letters an event with no registered handler', async () => {
        const { worker, repository } = build({ rows: [claimed], handler: undefined });

        await worker.drainOnce();

        expect(repository.markFailed).toHaveBeenCalledWith(
            'ob-1',
            'No handler registered for topic "accounting.journal-posted"',
            false,
            0,
        );
        expect(repository.markDelivered).not.toHaveBeenCalled();
    });
});
