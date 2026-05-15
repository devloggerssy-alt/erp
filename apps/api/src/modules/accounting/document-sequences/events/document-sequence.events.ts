import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { DocumentSequence } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.documentSequences.key;

export class DocumentSequenceCreatedEvent extends ResourceCreatedEvent<DocumentSequence> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class DocumentSequenceUpdatedEvent extends ResourceUpdatedEvent<DocumentSequence> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class DocumentSequenceDeletedEvent extends ResourceDeletedEvent<DocumentSequence> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
