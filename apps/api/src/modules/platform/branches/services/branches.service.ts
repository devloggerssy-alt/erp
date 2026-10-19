import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Branch } from '@devloggers/db-prisma';
import { CodeSequencesService } from '../../code-sequences/services/code-sequences.service';
import { BranchesRepository } from '../repositories/branches.repository';
import { BranchPresenter } from '../presenters/branch.presenter';
import { CreateBranchDto, UpdateBranchDto, BranchResponseDto } from '../dto';

@Injectable()
export class BranchesService extends CrudService<
    Branch,
    BranchResponseDto,
    CreateBranchDto,
    UpdateBranchDto
> {
    protected readonly resourceName = resources.branches.key;

    constructor(
        private readonly branchesRepository: BranchesRepository,
        private readonly branchPresenter: BranchPresenter,
        private readonly codeSequences: CodeSequencesService,
        private readonly emitter: EventEmitter2,
    ) {
        super(branchesRepository, branchPresenter, emitter);
    }

    override async findById(tenantId: string, id: string): Promise<BranchResponseDto> {
        const entity = await this.branchesRepository.findByIdWithWarehouses(tenantId, id);
        if (!entity) {
            throw new NotFoundException(`Branch with id "${id}" not found`);
        }
        return this.branchPresenter.toResponse(entity);
    }

    override async create(tenantId: string, dto: CreateBranchDto): Promise<BranchResponseDto> {
        const { warehouseIds, ...branchDto } = dto;
        if (warehouseIds && warehouseIds.length > 0) {
            await this.assertWarehousesBelongToTenant(tenantId, warehouseIds);
        }

        const created = await super.create(tenantId, branchDto as CreateBranchDto);

        if (warehouseIds && warehouseIds.length > 0) {
            await this.branchesRepository.replaceBranchWarehouses(tenantId, created.id, warehouseIds);
        }
        return this.findById(tenantId, created.id);
    }

    override async update(
        tenantId: string,
        id: string,
        dto: UpdateBranchDto,
    ): Promise<BranchResponseDto> {
        const { warehouseIds, ...branchDto } = dto;

        if (warehouseIds) {
            await this.assertWarehousesBelongToTenant(tenantId, warehouseIds);
            await this.assertNoWarehouseOrphaned(tenantId, id, warehouseIds);
        }

        await super.update(tenantId, id, branchDto as UpdateBranchDto);

        if (warehouseIds) {
            await this.branchesRepository.replaceBranchWarehouses(tenantId, id, warehouseIds);
        }
        return this.findById(tenantId, id);
    }

    protected override async beforeCreate(
        tenantId: string,
        dto: CreateBranchDto,
    ): Promise<void> {
        const code = dto.code?.trim();
        if (code) {
            if (await this.branchesRepository.isCodeTaken(tenantId, code)) {
                throw new ConflictException(`A branch with code "${code}" already exists`);
            }
            dto.code = code;
            return;
        }
        dto.code = await this.codeSequences.next(tenantId, 'branch', (candidate) =>
            this.branchesRepository.isCodeTaken(tenantId, candidate),
        );
    }

    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        const refs = await this.branchesRepository.countReferences(tenantId, id);
        if (refs.warehouses + refs.cashboxes + refs.documents > 0) {
            throw new ConflictException(
                'Cannot delete a branch that warehouses, cashboxes or documents refer to. Deactivate it instead.',
            );
        }
    }

    /** Refuses deactivating the branch currently set as the tenant's default. */
    protected override async beforeUpdate(
        tenantId: string,
        id: string,
        dto: UpdateBranchDto,
        existing: Branch,
    ): Promise<void> {
        if (dto.isActive !== false || !existing.isActive) return;

        const defaultBranchId = await this.branchesRepository.getDefaultBranchId(tenantId);
        if (defaultBranchId === id) {
            throw new ConflictException(
                'Cannot deactivate the default branch. Select another default branch first.',
            );
        }
    }

    // ── Consumed by the inventory (warehouse) domain ─────────────────────────────

    /** Refuses branch ids that are empty or do not belong to the tenant. */
    async assertBranchesBelongToTenant(tenantId: string, branchIds: string[]): Promise<void> {
        if (branchIds.length === 0) {
            throw new BadRequestException('A warehouse must belong to at least one branch');
        }
        const owned = await this.branchesRepository.countOwnedBranches(tenantId, branchIds);
        if (owned !== branchIds.length) {
            throw new BadRequestException('One or more branches do not belong to this tenant');
        }
    }

    /** Replaces the branches serving a warehouse (warehouse create/update path). */
    async replaceWarehouseBranches(
        tenantId: string,
        warehouseId: string,
        branchIds: string[],
    ): Promise<void> {
        await this.branchesRepository.replaceWarehouseBranches(tenantId, warehouseId, branchIds);
    }

    /**
     * Idempotently creates the tenant's default `MAIN` branch, named after the
     * tenant. Returns false when the tenant already has a branch.
     */
    async createDefault(tenantId: string): Promise<boolean> {
        const existing = await this.branchesRepository.findMany(tenantId, { take: 1 });
        if (existing.total > 0) return false;

        const tenant = await this.branchesRepository.getTenantDefaults(tenantId);
        await this.branchesRepository.create({
            tenantId,
            code: 'MAIN',
            name: { ar: tenant?.name ?? 'Main' },
            address: tenant?.address ?? null,
            phone: tenant?.phone ?? null,
        });
        return true;
    }

    private async assertWarehousesBelongToTenant(
        tenantId: string,
        warehouseIds: string[],
    ): Promise<void> {
        const owned = await this.branchesRepository.countOwnedWarehouses(tenantId, warehouseIds);
        if (owned !== warehouseIds.length) {
            throw new BadRequestException('One or more warehouses do not belong to this tenant');
        }
    }

    /**
     * Refuses an update that would leave a currently linked warehouse without any
     * branch — removing a warehouse's last branch is not allowed.
     */
    private async assertNoWarehouseOrphaned(
        tenantId: string,
        branchId: string,
        nextWarehouseIds: string[],
    ): Promise<void> {
        const current = await this.branchesRepository.listWarehouseIdsForBranch(tenantId, branchId);
        const next = new Set(nextWarehouseIds);
        const removed = current.filter((warehouseId) => !next.has(warehouseId));

        for (const warehouseId of removed) {
            const others = await this.branchesRepository.countOtherBranchesForWarehouse(
                tenantId,
                warehouseId,
                branchId,
            );
            if (others === 0) {
                throw new ConflictException(
                    'Cannot remove the last branch from a warehouse. Assign another branch first.',
                );
            }
        }
    }
}
