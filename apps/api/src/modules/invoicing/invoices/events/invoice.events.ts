import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Invoice } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.invoices.key;

export class InvoiceCreatedEvent extends ResourceCreatedEvent<Invoice> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class InvoicePostedEvent extends ResourceUpdatedEvent<Invoice> {
    static readonly NAME = `${RESOURCE_KEY}.posted`;
}

export class InvoiceCancelledEvent extends ResourceUpdatedEvent<Invoice> {
    static readonly NAME = `${RESOURCE_KEY}.cancelled`;
}

export class InvoiceDeletedEvent extends ResourceDeletedEvent<Invoice> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
