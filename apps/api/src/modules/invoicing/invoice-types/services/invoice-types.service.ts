import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { InvoiceType } from '@devloggers/db-prisma';
import { InvoiceTypesRepository } from '../repositories/invoice-types.repository';
import { InvoiceTypePresenter } from '../presenters/invoice-type.presenter';
import { CreateInvoiceTypeDto, UpdateInvoiceTypeDto, InvoiceTypeResponseDto } from '../dto';

@Injectable()
export class InvoiceTypesService extends CrudService<InvoiceType, InvoiceTypeResponseDto, CreateInvoiceTypeDto, UpdateInvoiceTypeDto> {
    protected readonly resourceName = resources.invoiceTypes.key;

    constructor(
        private readonly invoiceTypesRepository: InvoiceTypesRepository,
        private readonly invoiceTypePresenter: InvoiceTypePresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(invoiceTypesRepository, invoiceTypePresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateInvoiceTypeDto): Promise<void> {
        const taken = await this.invoiceTypesRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException(`An invoice type with code "${dto.code}" already exists`);
        }
    }
}
