import { Injectable } from '@nestjs/common';
import { Prisma } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { OUTBOX_STALE_LOCK_MS, type ClaimedOutboxEvent, type NewOutboxEvent, type OutboxTx } from './outbox.types';

@Injectable()
export class OutboxRepository {
    constructor(private readonly prisma: PrismaService) {}

    async enqueue(tx: OutboxTx, event: NewOutboxEvent): Promise<{ id: string }> {
        const row = await tx.outboxEvent.create({
            data: {
                tenantId: event.tenantId,
                topic: event.topic,
                payload: event.payload as Prisma.InputJsonValue,
                maxAttempts: event.maxAttempts ?? 5,
            },
            select: { id: true },
        });
        return { id: row.id };
    }

    /**
     * Claims a batch for processing: PENDING rows that are due, plus PROCESSING
     * rows whose lock is stale (worker crashed mid-delivery).
     */
    async claimPending(limit: number): Promise<ClaimedOutboxEvent[]> {
        const now = new Date();
        const staleBefore = new Date(now.getTime() - OUTBOX_STALE_LOCK_MS);

        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.outboxEvent.findMany({
                where: {
                    OR: [
                        { status: 'PENDING', availableAt: { lte: now } },
                        { status: 'PROCESSING', lockedAt: { lt: staleBefore } },
                    ],
                },
                orderBy: { createdAt: 'asc' },
                take: limit,
            });
            if (rows.length === 0) return [];

            await tx.outboxEvent.updateMany({
                where: { id: { in: rows.map((row) => row.id) } },
                data: { status: 'PROCESSING', lockedAt: now },
            });

            return rows.map((row) => ({
                id: row.id,
                tenantId: row.tenantId,
                topic: row.topic,
                payload: row.payload,
                attempts: row.attempts,
                maxAttempts: row.maxAttempts,
            }));
        });
    }

    async markDelivered(id: string): Promise<void> {
        await this.prisma.outboxEvent.update({
            where: { id },
            data: { status: 'DELIVERED', deliveredAt: new Date(), lastError: null },
        });
    }

    /**
     * Records a failure. `hasAttemptsLeft` false moves the row to DEAD
     * (Phase 8.4.3); otherwise it is rescheduled after `retryInMs`.
     */
    async markFailed(id: string, error: string, hasAttemptsLeft: boolean, retryInMs: number): Promise<void> {
        await this.prisma.outboxEvent.update({
            where: { id },
            data: hasAttemptsLeft
                ? {
                      status: 'PENDING',
                      attempts: { increment: 1 },
                      availableAt: new Date(Date.now() + retryInMs),
                      lastError: error,
                  }
                : { status: 'DEAD', attempts: { increment: 1 }, lastError: error },
        });
    }
}
