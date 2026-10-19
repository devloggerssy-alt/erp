import { Injectable, BadRequestException } from '@nestjs/common';
import { PartiesService, PartyTypeEnum } from '../../../parties';
import { InvoiceTypesService, InvoiceDirectionEnum } from '../../../invoicing';
import type { UpdatePosSettingDto } from '../dto';
import { PosSettingsRepository, type PosSettingWithRelations } from '../repositories/pos-settings.repository';

@Injectable()
export class PosSettingsService {
    constructor(
        private readonly repo: PosSettingsRepository,
        private readonly partiesService: PartiesService,
        private readonly invoiceTypesService: InvoiceTypesService,
    ) {}

    async get(tenantId: string): Promise<PosSettingWithRelations | null> {
        return this.repo.findByTenantId(tenantId);
    }

    async update(tenantId: string, dto: UpdatePosSettingDto): Promise<PosSettingWithRelations> {
        const existing = await this.repo.findByTenantId(tenantId);
        if (!existing) {
            throw new BadRequestException('POS is not set up for this tenant yet. Run provisioning first.');
        }

        const branchId = dto.branchId ?? existing.branchId;
        if (!branchId) {
            throw new BadRequestException('POS settings must have a branch assigned');
        }
        const cashboxId = dto.cashboxId ?? existing.cashboxId;
        const warehouseId = dto.warehouseId ?? existing.warehouseId;

        await this.assertBranchAssignable(tenantId, branchId, cashboxId, warehouseId);

        return this.repo.upsert(tenantId, {
            defaultPartyId: existing.defaultPartyId,
            invoiceTypeId: existing.invoiceTypeId,
            cashboxId,
            warehouseId,
            branchId,
        });
    }

    /**
     * The terminal's branch, cashbox and warehouse must describe one location:
     * the branch exists, the till cashbox belongs to it, and the issuing
     * warehouse is linked to it.
     */
    private async assertBranchAssignable(
        tenantId: string,
        branchId: string,
        cashboxId: string,
        warehouseId: string,
    ): Promise<void> {
        if (!(await this.repo.findActiveBranch(tenantId, branchId))) {
            throw new BadRequestException('Branch not found or inactive');
        }

        const cashbox = await this.repo.findActiveCashbox(tenantId, cashboxId);
        if (!cashbox) throw new BadRequestException('Cashbox not found or inactive');
        if (cashbox.branchId !== branchId) {
            throw new BadRequestException('The selected cashbox does not belong to the POS branch');
        }

        if (!(await this.repo.findActiveWarehouse(tenantId, warehouseId))) {
            throw new BadRequestException('Warehouse not found or inactive');
        }

        if (!(await this.repo.warehouseIsLinkedToBranch(tenantId, branchId, warehouseId))) {
            throw new BadRequestException('The selected warehouse is not linked to the POS branch');
        }
    }

    /** Idempotent: safe to call repeatedly. Creates the walk-in party and POS invoice type on first run. */
    async provision(tenantId: string): Promise<PosSettingWithRelations> {
        const existing = await this.repo.findByTenantId(tenantId);
        if (existing) return existing;

        const existingParties = await this.partiesService.list(tenantId, { where: { code: 'WALKIN' }, take: 1 });
        const walkInParty = existingParties.total > 0
            ? existingParties.data[0]!
            : await this.partiesService.create(tenantId, {
                code: 'WALKIN',
                name: 'Walk-in Customer',
                type: PartyTypeEnum.CUSTOMER,
            });

        const existingTypes = await this.invoiceTypesService.list(tenantId, { where: { code: 'POS' }, take: 1 });
        const posInvoiceType = existingTypes.total > 0
            ? existingTypes.data[0]!
            : await this.invoiceTypesService.create(tenantId, {
                code: 'POS',
                name: { ar: 'مبيعات نقطة البيع', en: 'POS Sales' },
                direction: InvoiceDirectionEnum.SALE,
                affectsStock: true,
            });

        const cashbox = await this.repo.findFirstActiveCashbox(tenantId);
        if (!cashbox) throw new BadRequestException('Create at least one active cashbox before setting up POS.');
        if (!cashbox.branchId) {
            throw new BadRequestException('Assign a branch to the till cashbox before setting up POS.');
        }

        if (!(await this.repo.findActiveBranch(tenantId, cashbox.branchId))) {
            throw new BadRequestException(
                'The till cashbox branch is inactive. Assign the cashbox to an active branch before setting up POS.',
            );
        }

        // Only warehouses linked to the till branch are eligible — POS settings
        // must describe one location.
        const warehouse = await this.repo.findFirstActiveWarehouseForBranch(tenantId, cashbox.branchId);
        if (!warehouse) {
            throw new BadRequestException(
                'Create at least one active warehouse linked to the till branch before setting up POS.',
            );
        }

        return this.repo.upsert(tenantId, {
            defaultPartyId: walkInParty.id,
            invoiceTypeId: posInvoiceType.id,
            cashboxId: cashbox.id,
            warehouseId: warehouse.id,
            branchId: cashbox.branchId,
        });
    }
}
