import {
  ResourceCreatedEvent,
  ResourceUpdatedEvent,
  ResourceDeletedEvent,
} from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { CatalogEntity } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.catalogEntities.key;

export class CatalogEntityCreatedEvent extends ResourceCreatedEvent<CatalogEntity> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class CatalogEntityUpdatedEvent extends ResourceUpdatedEvent<CatalogEntity> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class CatalogEntityDeletedEvent extends ResourceDeletedEvent<CatalogEntity> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
