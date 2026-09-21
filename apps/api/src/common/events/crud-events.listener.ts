import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResourceCreatedEvent, ResourceDeletedEvent, ResourceUpdatedEvent } from '@devloggers/backend-core';

/**
 * Phase 8.4.5 (F3 decision) — CRUD events are kept and consumed here instead
 * of being deleted. One structured debug line per mutation; this is the seam
 * where future consumers (search index, webhooks, analytics) plug in.
 *
 * Requires EventEmitterModule wildcard mode (see app.module.ts).
 */
@Injectable()
export class CrudEventsListener {
    private readonly logger = new Logger(CrudEventsListener.name);

    @OnEvent('**.created')
    handleCreated(event: ResourceCreatedEvent): void {
        this.log('created', event);
    }

    @OnEvent('**.updated')
    handleUpdated(event: ResourceUpdatedEvent): void {
        this.log('updated', event);
    }

    @OnEvent('**.deleted')
    handleDeleted(event: ResourceDeletedEvent): void {
        this.log('deleted', event);
    }

    private log(action: string, event: ResourceCreatedEvent | ResourceUpdatedEvent | ResourceDeletedEvent): void {
        const payload = event.payload as { id?: string } | null;
        this.logger.debug({
            msg: 'crud event',
            action,
            resource: event.resourceName,
            tenantId: event.tenantId,
            entityId: payload?.id,
        });
    }
}
