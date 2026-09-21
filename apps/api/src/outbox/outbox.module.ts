import { Module } from '@nestjs/common';
import { LoggingOutboxHandler } from './logging-outbox.handler';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OutboxRepository } from './outbox.repository';
import { OutboxWorkerService } from './outbox-worker.service';

/** Phase 8.4 — outbox infrastructure. Imported by PostingModule; not a domain. */
@Module({
    providers: [OutboxRepository, OutboxHandlerRegistry, OutboxWorkerService, LoggingOutboxHandler],
    exports: [OutboxRepository],
})
export class OutboxModule {}
