import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { RequestContext } from '../common/request-context/request-context';
import { SYSTEM_USER_ID } from '../modules/audit';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OutboxRepository } from './outbox.repository';
import { OUTBOX_RETRY_DELAY_MS, type ClaimedOutboxEvent } from './outbox.types';

export const OUTBOX_DRAIN_BATCH = 20;

/**
 * Phase 8.4.3 — poll loop with retry and dead-letter. OFF by default
 * (`OUTBOX_ENABLED=false`, Phase 8.4.4): the facade does not enqueue and the
 * interval returns immediately, so the sync posting path is untouched.
 */
@Injectable()
export class OutboxWorkerService {
    private readonly logger = new Logger(OutboxWorkerService.name);

    constructor(
        private readonly repository: OutboxRepository,
        private readonly registry: OutboxHandlerRegistry,
        private readonly config: ConfigService,
    ) {}

    @Interval('outbox-drain', 5_000)
    async handleInterval(): Promise<void> {
        if (this.config.get<string>('OUTBOX_ENABLED') !== 'true') return;
        await this.drainOnce();
    }

    async drainOnce(limit = OUTBOX_DRAIN_BATCH): Promise<number> {
        const events = await this.repository.claimPending(limit);
        for (const event of events) {
            await this.deliver(event);
        }
        return events.length;
    }

    private async deliver(event: ClaimedOutboxEvent): Promise<void> {
        const handler = this.registry.resolve(event.topic);
        if (!handler) {
            await this.repository.markFailed(event.id, `No handler registered for topic "${event.topic}"`, false, 0);
            this.logger.error({ msg: 'outbox event dead-lettered (no handler)', eventId: event.id, topic: event.topic });
            return;
        }

        try {
            await RequestContext.run(
                { correlationId: randomUUID(), source: 'SCHEDULER', tenantId: event.tenantId, userId: SYSTEM_USER_ID },
                () =>
                    handler(event.payload, {
                        eventId: event.id,
                        tenantId: event.tenantId,
                        topic: event.topic,
                        attempt: event.attempts + 1,
                    }),
            );
            await this.repository.markDelivered(event.id);
        } catch (error) {
            const nextAttempt = event.attempts + 1;
            const hasAttemptsLeft = nextAttempt < event.maxAttempts;
            const message = error instanceof Error ? error.message : String(error);
            await this.repository.markFailed(event.id, message, hasAttemptsLeft, OUTBOX_RETRY_DELAY_MS);
            this.logger.warn({
                msg: hasAttemptsLeft ? 'outbox event failed, will retry' : 'outbox event dead-lettered',
                eventId: event.id,
                topic: event.topic,
                attempts: nextAttempt,
                error: message,
            });
        }
    }
}
