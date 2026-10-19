import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Warehouse } from '@devloggers/db-prisma';
import { BranchesService, CodeSequencesService } from '@/modules/platform';
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
        private readonly branchesService: BranchesService,
        private readonly emitter: EventEmitter2,
    ) {
        super(warehousesRepository, warehousePresenter, emitter);
    }

    override async findById(tenantId: string, id: string): Promise<WarehouseResponseDto> {
        const entity = await this.warehousesRepository.findByIdWithBranches(tenantId, id);
        if (!entity) {
            throw new NotFoundException(`Warehouse with id "${id}" not found`);
        }
        return this.warehousePresenter.toResponse(entity);
    }

    override async create(tenantId: string, dto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
        const { branchIds, ...warehouseDto } = dto;
        await this.branchesService.assertBranchesBelongToTenant(tenantId, branchIds);

        const created = await super.create(tenantId, warehouseDto as CreateWarehouseDto);
        await this.branchesService.replaceWarehouseBranches(tenantId, created.id, branchIds);
        return this.findById(tenantId, created.id);
    }

    override async update(
        tenantId: string,
        id: string,
        dto: UpdateWarehouseDto,
    ): Promise<WarehouseResponseDto> {
        const { branchIds, ...warehouseDto } = dto;
        if (branchIds) {
            await this.branchesService.assertBranchesBelongToTenant(tenantId, branchIds);
        }

        await super.update(tenantId, id, warehouseDto as UpdateWarehouseDto);

        if (branchIds) {
            await this.branchesService.replaceWarehouseBranches(tenantId, id, branchIds);
        }
        return this.findById(tenantId, id);
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
