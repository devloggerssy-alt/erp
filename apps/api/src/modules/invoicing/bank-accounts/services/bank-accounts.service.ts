import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { BankAccount } from '@devloggers/db-prisma';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import { BankAccountPresenter } from '../presenters/bank-account.presenter';
import { CreateBankAccountDto, UpdateBankAccountDto, BankAccountResponseDto } from '../dto';

@Injectable()
export class BankAccountsService extends CrudService<BankAccount, BankAccountResponseDto, CreateBankAccountDto, UpdateBankAccountDto> {
    protected readonly resourceName = resources.bankAccounts.key;

    constructor(
        private readonly bankAccountsRepository: BankAccountsRepository,
        private readonly bankAccountPresenter: BankAccountPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(bankAccountsRepository, bankAccountPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateBankAccountDto): Promise<void> {
        const taken = await this.bankAccountsRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException(`A bank account with code "${dto.code}" already exists`);
        }
    }

    protected override async beforeUpdate(_tenantId: string, _id: string, _dto: UpdateBankAccountDto): Promise<void> {
        // No unique check on update since code is immutable after creation (not in UpdateBankAccountDto)
    }

    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.bankAccountsRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a bank account that has journal entries. Deactivate it instead.',
            );
        }
    }
}
