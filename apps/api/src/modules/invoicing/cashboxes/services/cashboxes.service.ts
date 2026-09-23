import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Cashbox } from '@devloggers/db-prisma';
import { CodeSequencesService } from '@/modules/platform';
import { CashboxesRepository } from '../repositories/cashboxes.repository';
import { CashboxPresenter } from '../presenters/cashbox.presenter';
import { CreateCashboxDto, UpdateCashboxDto, CashboxResponseDto } from '../dto';

@Injectable()
export class CashboxesService extends CrudService<Cashbox, CashboxResponseDto, CreateCashboxDto, UpdateCashboxDto> {
    protected readonly resourceName = resources.cashboxes.key;

    constructor(
        private readonly cashboxesRepository: CashboxesRepository,
        private readonly cashboxPresenter: CashboxPresenter,
        private readonly codeSequences: CodeSequencesService,
        private readonly emitter: EventEmitter2,
    ) {
        super(cashboxesRepository, cashboxPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateCashboxDto): Promise<void> {
        const code = dto.code?.trim();
        if (code) {
            if (await this.cashboxesRepository.isCodeTaken(tenantId, code)) {
                throw new ConflictException(`A cashbox with code "${code}" already exists`);
            }
            dto.code = code;
            return;
        }
        dto.code = await this.codeSequences.next(tenantId, 'cashbox', (candidate) =>
            this.cashboxesRepository.isCodeTaken(tenantId, candidate),
        );
    }

    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.cashboxesRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a cashbox that has journal entries. Deactivate it instead.',
            );
        }
    }
}
