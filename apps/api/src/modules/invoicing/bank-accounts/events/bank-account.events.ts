import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { BankAccount } from '@devloggers/db-prisma';

const RESOURCE_KEY = resources.bankAccounts.key;

export class BankAccountCreatedEvent extends ResourceCreatedEvent<BankAccount> {
    static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

export class BankAccountUpdatedEvent extends ResourceUpdatedEvent<BankAccount> {
    static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

export class BankAccountDeletedEvent extends ResourceDeletedEvent<BankAccount> {
    static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
