import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { PartiesService, PartyTypeEnum } from '../../../parties';
import { InvoiceTypesService, InvoiceDirectionEnum } from '../../../invoicing';
import type { UpdatePosSettingDto } from '../dto';
import { PosSettingsRepository, type PosSettingWithRelations } from '../repositories/pos-settings.repository';

@Injectable()
export class PosSettingsService {
    constructor(
        private readonly repo: PosSettingsRepository,
        private readonly prisma: PrismaService,
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

        if (dto.cashboxId) {
            const cashbox = await this.prisma.cashbox.findFirst({ where: { id: dto.cashboxId, tenantId, isActive: true } });
            if (!cashbox) throw new BadRequestException('Cashbox not found or inactive');
        }
        if (dto.warehouseId) {
            const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId, isActive: true } });
            if (!warehouse) throw new BadRequestException('Warehouse not found or inactive');
        }

        return this.repo.upsert(tenantId, {
            defaultPartyId: existing.defaultPartyId,
            invoiceTypeId: existing.invoiceTypeId,
            cashboxId: dto.cashboxId ?? existing.cashboxId,
            warehouseId: dto.warehouseId ?? existing.warehouseId,
        });
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

        const cashbox = await this.prisma.cashbox.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
        if (!cashbox) throw new BadRequestException('Create at least one active cashbox before setting up POS.');

        const warehouse = await this.prisma.warehouse.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
        if (!warehouse) throw new BadRequestException('Create at least one active warehouse before setting up POS.');

        return this.repo.upsert(tenantId, {
            defaultPartyId: walkInParty.id,
            invoiceTypeId: posInvoiceType.id,
            cashboxId: cashbox.id,
            warehouseId: warehouse.id,
        });
    }
}
