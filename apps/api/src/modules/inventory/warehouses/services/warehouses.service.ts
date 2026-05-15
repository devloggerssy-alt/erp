import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Warehouse } from '@devloggers/db-prisma';
import { WarehousesRepository } from '../repositories/warehouses.repository';
import { WarehousePresenter } from '../presenters/warehouse.presenter';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseResponseDto } from '../dto';

@Injectable()
export class WarehousesService extends CrudService<Warehouse, WarehouseResponseDto, CreateWarehouseDto, UpdateWarehouseDto> {
    protected readonly resourceName = resources.warehouses.key;

    constructor(
        private readonly warehousesRepository: WarehousesRepository,
        private readonly warehousePresenter: WarehousePresenter,
        private readonly emitter: EventEmitter2,
    ) {
        super(warehousesRepository, warehousePresenter, emitter);
    }

    protected override async beforeCreate(tenantId: string, dto: CreateWarehouseDto): Promise<void> {
        const taken = await this.warehousesRepository.isCodeTaken(tenantId, dto.code);
        if (taken) {
            throw new ConflictException(`A warehouse with code "${dto.code}" already exists`);
        }
    }

    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateWarehouseDto,
    ): Promise<void> {
        if (dto.code) {
            const taken = await this.warehousesRepository.isCodeTaken(tenantId, dto.code, id);
            if (taken) {
                throw new ConflictException(`A warehouse with code "${dto.code}" already exists`);
            }
        }
    }
}
