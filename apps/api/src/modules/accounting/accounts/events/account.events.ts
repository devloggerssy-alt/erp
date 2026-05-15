import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import type { ChartOfAccount } from '@devloggers/db-prisma';

const RESOURCE_KEY = 'chart-of-accounts';

/** Emitted when a chart-of-account entry is created. */
export class AccountCreatedEvent extends ResourceCreatedEvent<ChartOfAccount> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a chart-of-account entry is updated. */
export class AccountUpdatedEvent extends ResourceUpdatedEvent<ChartOfAccount> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a chart-of-account entry is deleted. */
export class AccountDeletedEvent extends ResourceDeletedEvent<ChartOfAccount> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
