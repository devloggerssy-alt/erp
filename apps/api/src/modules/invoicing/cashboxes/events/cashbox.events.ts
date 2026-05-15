import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Cashbox } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.cashboxes.key;

export class CashboxCreatedEvent extends ResourceCreatedEvent<Cashbox> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class CashboxUpdatedEvent extends ResourceUpdatedEvent<Cashbox> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class CashboxDeletedEvent extends ResourceDeletedEvent<Cashbox> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
