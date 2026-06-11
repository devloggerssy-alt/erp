import {
  ResourceCreatedEvent,
  ResourceUpdatedEvent,
  ResourceDeletedEvent,
} from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Tag } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.tags.key;

/** Emitted when a tag is created. Listen with @OnEvent(TagCreatedEvent.NAME) */
export class TagCreatedEvent extends ResourceCreatedEvent<Tag> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a tag is updated. Listen with @OnEvent(TagUpdatedEvent.NAME) */
export class TagUpdatedEvent extends ResourceUpdatedEvent<Tag> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a tag is deleted. Listen with @OnEvent(TagDeletedEvent.NAME) */
export class TagDeletedEvent extends ResourceDeletedEvent<Tag> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
