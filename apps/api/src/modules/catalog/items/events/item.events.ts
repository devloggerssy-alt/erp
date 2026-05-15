import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Item } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.items.key;

export class ItemCreatedEvent extends ResourceCreatedEvent<Item> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class ItemUpdatedEvent extends ResourceUpdatedEvent<Item> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class ItemDeletedEvent extends ResourceDeletedEvent<Item> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
