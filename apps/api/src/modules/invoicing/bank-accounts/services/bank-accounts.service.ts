import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { BankAccount } from '@devloggers/db-prisma';
import { CodeSequencesService } from '@/modules/platform';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import { BankAccountPresenter } from '../presenters/bank-account.presenter';
import { CreateBankAccountDto, UpdateBankAccountDto, BankAccountResponseDto } from '../dto';

@Injectable()
export class BankAccountsService extends CrudService<BankAccount, BankAccountResponseDto, CreateBankAccountDto, UpdateBankAccountDto> {
    protected readonly resourceName = resources.bankAccounts.key;

    constructor(
        private readonly bankAccountsRepository: BankAccountsRepository,
        private readonly bankAccountPresenter: BankAccountPresenter,
        private readonly codeSequences: CodeSequencesService,
        private readonly emitter: EventEmitter2,
    ) {
        super(bankAccountsRepository, bankAccountPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateBankAccountDto): Promise<void> {
        await this.assertBranch(tenantId, dto.branchId);

        const code = dto.code?.trim();
        if (code) {
            if (await this.bankAccountsRepository.isCodeTaken(tenantId, code)) {
                throw new ConflictException(`A bank account with code "${code}" already exists`);
            }
            dto.code = code;
            return;
        }
        dto.code = await this.codeSequences.next(tenantId, 'bank_account', (candidate) =>
            this.bankAccountsRepository.isCodeTaken(tenantId, candidate),
        );
    }

    protected override async beforeUpdate(tenantId: string, _id: string, dto: UpdateBankAccountDto): Promise<void> {
        // No unique check on update since code is immutable after creation (not in UpdateBankAccountDto)
        if (dto.branchId !== undefined) {
            await this.assertBranch(tenantId, dto.branchId);
        }
    }

    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.bankAccountsRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a bank account that has journal entries. Deactivate it instead.',
            );
        }
    }

    /** A branch reference is optional, but when present it must be in the tenant. */
    private async assertBranch(tenantId: string, branchId: string | null | undefined): Promise<void> {
        if (!branchId) return;
        if (!(await this.bankAccountsRepository.branchExists(tenantId, branchId))) {
            throw new BadRequestException('Branch not found');
        }
    }
}
