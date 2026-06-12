import {
  ResourceCreatedEvent,
  ResourceUpdatedEvent,
  ResourceDeletedEvent,
} from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { ItemCatalogEntity } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.itemCatalogEntities.key;

export class ItemCatalogEntityCreatedEvent extends ResourceCreatedEvent<ItemCatalogEntity> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class ItemCatalogEntityUpdatedEvent extends ResourceUpdatedEvent<ItemCatalogEntity> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class ItemCatalogEntityDeletedEvent extends ResourceDeletedEvent<ItemCatalogEntity> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
