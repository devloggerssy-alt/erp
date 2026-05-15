import { ResourceCreatedEvent, ResourceUpdatedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { StockCount } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.stockCounts.key;

export class StockCountCreatedEvent extends ResourceCreatedEvent<StockCount> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class StockCountPostedEvent extends ResourceUpdatedEvent<StockCount> {
    static readonly NAME = `${RESOURCE_KEY}.posted`;
}
