import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { FiscalPeriod } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.fiscalPeriods.key;

export class FiscalPeriodCreatedEvent extends ResourceCreatedEvent<FiscalPeriod> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class FiscalPeriodUpdatedEvent extends ResourceUpdatedEvent<FiscalPeriod> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class FiscalPeriodDeletedEvent extends ResourceDeletedEvent<FiscalPeriod> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
