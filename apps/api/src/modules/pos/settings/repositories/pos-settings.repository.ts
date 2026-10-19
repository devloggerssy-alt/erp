import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

const POS_SETTING_INCLUDE = {
    defaultParty: true,
    invoiceType: true,
    cashbox: true,
    warehouse: true,
    branch: true,
} satisfies Prisma.PosSettingInclude;

export type PosSettingWithRelations = Prisma.PosSettingGetPayload<{ include: typeof POS_SETTING_INCLUDE }>;

type IdRow = { id: string };

@Injectable()
export class PosSettingsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByTenantId(tenantId: string): Promise<PosSettingWithRelations | null> {
        return this.prisma.posSetting.findUnique({ where: { tenantId }, include: POS_SETTING_INCLUDE });
    }

    async upsert(
        tenantId: string,
        data: {
            defaultPartyId: string;
            invoiceTypeId: string;
            cashboxId: string;
            warehouseId: string;
            branchId: string;
        },
    ): Promise<PosSettingWithRelations> {
        return this.prisma.posSetting.upsert({
            where: { tenantId },
            create: { tenantId, ...data },
            update: data,
            include: POS_SETTING_INCLUDE,
        });
    }

    async findActiveBranch(tenantId: string, branchId: string): Promise<IdRow | null> {
        return this.prisma.branch.findFirst({
            where: { id: branchId, tenantId, isActive: true },
            select: { id: true },
        });
    }

    async findActiveCashbox(
        tenantId: string,
        cashboxId: string,
    ): Promise<{ id: string; branchId: string | null } | null> {
        return this.prisma.cashbox.findFirst({
            where: { id: cashboxId, tenantId, isActive: true },
            select: { id: true, branchId: true },
        });
    }

    /** The till used by provisioning when the tenant has no POS settings yet. */
    async findFirstActiveCashbox(
        tenantId: string,
    ): Promise<{ id: string; branchId: string | null } | null> {
        return this.prisma.cashbox.findFirst({
            where: { tenantId, isActive: true },
            orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
            select: { id: true, branchId: true },
        });
    }

    async findActiveWarehouse(tenantId: string, warehouseId: string): Promise<IdRow | null> {
        return this.prisma.warehouse.findFirst({
            where: { id: warehouseId, tenantId, isActive: true },
            select: { id: true },
        });
    }

    async findFirstActiveWarehouseForBranch(tenantId: string, branchId: string): Promise<IdRow | null> {
        // code breaks createdAt ties. Seeded warehouses share one timestamp, and
        // an unordered tie was binding the till to the empty showroom.
        return this.prisma.warehouse.findFirst({
            where: { tenantId, isActive: true, branches: { some: { branchId } } },
            orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
            select: { id: true },
        });
    }

    async warehouseIsLinkedToBranch(
        tenantId: string,
        branchId: string,
        warehouseId: string,
    ): Promise<boolean> {
        const link = await this.prisma.branchWarehouse.findFirst({
            where: { tenantId, branchId, warehouseId },
            select: { id: true },
        });
        return link !== null;
    }
}
