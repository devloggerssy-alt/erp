import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Currency } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.currencies.key;

export class CurrencyCreatedEvent extends ResourceCreatedEvent<Currency> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class CurrencyUpdatedEvent extends ResourceUpdatedEvent<Currency> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class CurrencyDeletedEvent extends ResourceDeletedEvent<Currency> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
