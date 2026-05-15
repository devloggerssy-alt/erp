import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Role } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.roles.key;

export class RoleCreatedEvent extends ResourceCreatedEvent<Role> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class RoleUpdatedEvent extends ResourceUpdatedEvent<Role> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class RoleDeletedEvent extends ResourceDeletedEvent<Role> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
