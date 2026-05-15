import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Party } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.parties.key;

export class PartyCreatedEvent extends ResourceCreatedEvent<Party> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class PartyUpdatedEvent extends ResourceUpdatedEvent<Party> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class PartyDeletedEvent extends ResourceDeletedEvent<Party> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
