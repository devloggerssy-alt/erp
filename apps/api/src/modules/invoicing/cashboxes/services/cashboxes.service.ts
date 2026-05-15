import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Cashbox } from '@devloggers/db-prisma';
import { CashboxesRepository } from '../repositories/cashboxes.repository';
import { CashboxPresenter } from '../presenters/cashbox.presenter';
import { CreateCashboxDto, UpdateCashboxDto, CashboxResponseDto } from '../dto';

@Injectable()
export class CashboxesService extends CrudService<Cashbox, CashboxResponseDto, CreateCashboxDto, UpdateCashboxDto> {
    protected readonly resourceName = resources.cashboxes.key;

    constructor(
        private readonly cashboxesRepository: CashboxesRepository,
        private readonly cashboxPresenter: CashboxPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(cashboxesRepository, cashboxPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateCashboxDto): Promise<void> {
        const taken = await this.cashboxesRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException(`A cashbox with code "${dto.code}" already exists`);
        }
    }
}
