import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Unit } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.units.key; // 'units'

/** Emitted when a unit of measure is created. Listen with @OnEvent(UnitCreatedEvent.NAME) */
export class UnitCreatedEvent extends ResourceCreatedEvent<Unit> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a unit of measure is updated. Listen with @OnEvent(UnitUpdatedEvent.NAME) */
export class UnitUpdatedEvent extends ResourceUpdatedEvent<Unit> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a unit of measure is deleted. Listen with @OnEvent(UnitDeletedEvent.NAME) */
export class UnitDeletedEvent extends ResourceDeletedEvent<Unit> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
