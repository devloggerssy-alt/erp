import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Brand } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.brands.key;

export class BrandCreatedEvent extends ResourceCreatedEvent<Brand> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class BrandUpdatedEvent extends ResourceUpdatedEvent<Brand> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class BrandDeletedEvent extends ResourceDeletedEvent<Brand> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
