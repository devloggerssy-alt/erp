import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import type { ChartOfAccount } from '@devloggers/db-prisma';
import { AccountsRepository } from '../repositories/accounts.repository';
import { AccountPresenter } from '../presenters/account.presenter';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto, ChartOfAccountResponseDto } from '../dto';

@Injectable()
export class AccountsService extends CrudService<
    ChartOfAccount,
    ChartOfAccountResponseDto,
    CreateChartOfAccountDto,
    UpdateChartOfAccountDto
> {
    protected readonly resourceName = 'chart-of-accounts';

    constructor(
        private readonly accountsRepository: AccountsRepository,
        private readonly accountPresenter: AccountPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(accountsRepository, accountPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateChartOfAccountDto): Promise<void> {
        const taken = await this.accountsRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException(`An account with code "${dto.code}" already exists`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateChartOfAccountDto,
    ): Promise<void> {
        // code is immutable after creation — no duplicate check needed on update
        // validate no self-referencing parent
        if (dto.parentId === id) {
            throw new ConflictException('An account cannot be its own parent');
        }
    }
}
