import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Warehouse } from '@devloggers/db-prisma';
import { CodeSequencesService } from '@/modules/platform';
import { WarehousesRepository } from '../repositories/warehouses.repository';
import { WarehousePresenter } from '../presenters/warehouse.presenter';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseResponseDto } from '../dto';

@Injectable()
export class WarehousesService extends CrudService<Warehouse, WarehouseResponseDto, CreateWarehouseDto, UpdateWarehouseDto> {
    protected readonly resourceName = resources.warehouses.key;

    constructor(
        private readonly warehousesRepository: WarehousesRepository,
        private readonly warehousePresenter: WarehousePresenter,
        private readonly codeSequences: CodeSequencesService,
        private readonly emitter: EventEmitter2,
    ) {
        super(warehousesRepository, warehousePresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateWarehouseDto): Promise<void> {
        const code = dto.code?.trim();
        if (code) {
            if (await this.warehousesRepository.isCodeTaken(tenantId, code)) {
                throw new ConflictException(`A warehouse with code "${code}" already exists`);
            }
            dto.code = code;
            return;
        }
        dto.code = await this.codeSequences.next(tenantId, 'warehouse', (candidate) =>
            this.warehousesRepository.isCodeTaken(tenantId, candidate),
        );
    }
}
