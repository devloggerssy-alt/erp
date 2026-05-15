import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { ItemCategory } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.itemCategories.key;

export class ItemCategoryCreatedEvent extends ResourceCreatedEvent<ItemCategory> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class ItemCategoryUpdatedEvent extends ResourceUpdatedEvent<ItemCategory> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class ItemCategoryDeletedEvent extends ResourceDeletedEvent<ItemCategory> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
