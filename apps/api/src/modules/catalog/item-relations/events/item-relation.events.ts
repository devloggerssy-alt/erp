import {
  ResourceCreatedEvent,
  ResourceUpdatedEvent,
  ResourceDeletedEvent,
} from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { ItemRelation } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.itemRelations.key;

/** Emitted when an item relation is created. Listen with @OnEvent(ItemRelationCreatedEvent.NAME) */
export class ItemRelationCreatedEvent extends ResourceCreatedEvent<ItemRelation> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when an item relation is updated. Listen with @OnEvent(ItemRelationUpdatedEvent.NAME) */
export class ItemRelationUpdatedEvent extends ResourceUpdatedEvent<ItemRelation> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when an item relation is deleted. Listen with @OnEvent(ItemRelationDeletedEvent.NAME) */
export class ItemRelationDeletedEvent extends ResourceDeletedEvent<ItemRelation> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
