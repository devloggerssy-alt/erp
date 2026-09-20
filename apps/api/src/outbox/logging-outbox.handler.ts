import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OUTBOX_TOPICS, type OutboxHandlerMeta } from './outbox.types';

/**
 * Default consumer of the dual-write seam: one structured debug line per
 * delivered posting event. When a real async GL split happens, this is the
 * registration point that gets swapped for the remote handler.
 */
@Injectable()
export class LoggingOutboxHandler implements OnModuleInit {
    private readonly logger = new Logger(LoggingOutboxHandler.name);

    constructor(private readonly registry: OutboxHandlerRegistry) {}

    onModuleInit(): void {
        this.registry.register(OUTBOX_TOPICS.journalPosted, (payload, meta) => this.log(payload, meta));
        this.registry.register(OUTBOX_TOPICS.journalReversed, (payload, meta) => this.log(payload, meta));
    }

    private log(payload: unknown, meta: OutboxHandlerMeta): Promise<void> {
        const entry = payload as { journalEntryId?: string; number?: string; intentKind?: string } | null;
        this.logger.debug({
            msg: 'outbox event delivered',
            topic: meta.topic,
            tenantId: meta.tenantId,
            eventId: meta.eventId,
            attempt: meta.attempt,
            journalEntryId: entry?.journalEntryId,
            number: entry?.number,
            intentKind: entry?.intentKind,
        });
        return Promise.resolve();
    }
}
