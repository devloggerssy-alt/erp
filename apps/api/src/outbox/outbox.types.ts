import type { Prisma } from '@devloggers/db-prisma';

/** Transaction client used by `enqueue` — the caller's tx, so outbox rows commit atomically. */
export type OutboxTx = Prisma.TransactionClient;

export const OUTBOX_TOPICS = {
    journalPosted: 'accounting.journal-posted',
    journalReversed: 'accounting.journal-reversed',
} as const;

export type OutboxTopic = (typeof OUTBOX_TOPICS)[keyof typeof OUTBOX_TOPICS];

/** Retry delay for a failed delivery (Phase 8.4.3). */
export const OUTBOX_RETRY_DELAY_MS = 5_000;

/** A PROCESSING row older than this is considered abandoned and can be reclaimed. */
export const OUTBOX_STALE_LOCK_MS = 60_000;

export interface NewOutboxEvent {
    tenantId: string;
    topic: OutboxTopic | string;
    /** JSON-serializable payload (Phase 8.4.1). */
    payload: unknown;
    maxAttempts?: number;
}

export interface ClaimedOutboxEvent {
    id: string;
    tenantId: string;
    topic: string;
    payload: unknown;
    attempts: number;
    maxAttempts: number;
}

export interface OutboxHandlerMeta {
    eventId: string;
    tenantId: string;
    topic: string;
    attempt: number;
}

export type OutboxEventHandler = (payload: unknown, meta: OutboxHandlerMeta) => Promise<void>;
