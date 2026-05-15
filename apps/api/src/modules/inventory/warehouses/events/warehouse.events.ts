import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Warehouse } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.warehouses.key;

export class WarehouseCreatedEvent extends ResourceCreatedEvent<Warehouse> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class WarehouseUpdatedEvent extends ResourceUpdatedEvent<Warehouse> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class WarehouseDeletedEvent extends ResourceDeletedEvent<Warehouse> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
