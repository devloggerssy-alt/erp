import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { InvoiceType } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.invoiceTypes.key;

export class InvoiceTypeCreatedEvent extends ResourceCreatedEvent<InvoiceType> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class InvoiceTypeUpdatedEvent extends ResourceUpdatedEvent<InvoiceType> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class InvoiceTypeDeletedEvent extends ResourceDeletedEvent<InvoiceType> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
