import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Branch } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.branches.key;

export class BranchCreatedEvent extends ResourceCreatedEvent<Branch> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class BranchUpdatedEvent extends ResourceUpdatedEvent<Branch> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class BranchDeletedEvent extends ResourceDeletedEvent<Branch> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
