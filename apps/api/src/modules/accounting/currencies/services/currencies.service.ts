import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Currency } from '@devloggers/db-prisma';
import { CurrenciesRepository } from '../repositories/currencies.repository';
import { CurrencyPresenter } from '../presenters/currency.presenter';
import { CreateCurrencyDto, UpdateCurrencyDto, CurrencyResponseDto } from '../dto';

@Injectable()
export class CurrenciesService extends CrudService<Currency, CurrencyResponseDto, CreateCurrencyDto, UpdateCurrencyDto> {
    protected readonly resourceName = resources.currencies.key;

    constructor(
        private readonly currenciesRepository: CurrenciesRepository,
        private readonly currencyPresenter: CurrencyPresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(currenciesRepository, currencyPresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateCurrencyDto): Promise<void> {
        const taken = await this.currenciesRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException('Currency code already exists');
        }

        if (dto.isBase) {
            const existingBase = await this.currenciesRepository.findBase(tenantId);
            if (existingBase) {
                throw new BadRequestException(
                    `Base currency already set to ${existingBase.code}. Unset it first.`,
                );
            }
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateCurrencyDto,
    ): Promise<void> {
        if (dto.isBase === true) {
            const existing = await this.currenciesRepository.findById(tenantId, id);
            if (existing && !existing.isBase) {
                await this.currenciesRepository.clearBase(tenantId);
            }
        }
    }
}
