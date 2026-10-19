import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { SettingKey } from '@devloggers/api-contracts';
import type { Branch, Prisma } from '@devloggers/db-prisma';

const BRANCH_DETAIL_INCLUDE = {
    warehouses: {
        include: { warehouse: { select: { id: true, code: true, name: true } } },
        orderBy: { createdAt: 'asc' },
    },
} satisfies Prisma.BranchInclude;

export type BranchWithWarehouses = Prisma.BranchGetPayload<{
    include: typeof BRANCH_DETAIL_INCLUDE;
}>;

export interface BranchReferenceCounts {
    warehouses: number;
    cashboxes: number;
    documents: number;
}

/** Settings-registry key holding the tenant's default branch id (see api-contracts). */
const DEFAULT_BRANCH_SETTING_KEY: SettingKey = 'defaultBranchId';

@Injectable()
export class BranchesRepository extends CrudRepository<Branch, Prisma.BranchDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.branch);
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.branch.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }

    async findByIdWithWarehouses(tenantId: string, id: string): Promise<BranchWithWarehouses | null> {
        return this.prisma.branch.findFirst({
            where: { id, tenantId },
            include: BRANCH_DETAIL_INCLUDE,
        });
    }

    /** How many of the given ids name a branch that belongs to this tenant. */
    async countOwnedBranches(tenantId: string, ids: string[]): Promise<number> {
        if (ids.length === 0) return 0;
        return this.prisma.branch.count({ where: { tenantId, id: { in: ids } } });
    }

    /** How many of the given ids name a warehouse that belongs to this tenant. */
    async countOwnedWarehouses(tenantId: string, ids: string[]): Promise<number> {
        if (ids.length === 0) return 0;
        return this.prisma.warehouse.count({ where: { tenantId, id: { in: ids } } });
    }

    async listWarehouseIdsForBranch(tenantId: string, branchId: string): Promise<string[]> {
        const rows = await this.prisma.branchWarehouse.findMany({
            where: { tenantId, branchId },
            select: { warehouseId: true },
        });
        return rows.map((row) => row.warehouseId);
    }

    /**
     * Branches other than `excludeBranchId` that still serve the warehouse.
     * Zero means the warehouse would be left without a branch.
     */
    async countOtherBranchesForWarehouse(
        tenantId: string,
        warehouseId: string,
        excludeBranchId: string,
    ): Promise<number> {
        return this.prisma.branchWarehouse.count({
            where: { tenantId, warehouseId, branchId: { not: excludeBranchId } },
        });
    }

    /** Replaces the warehouses linked to a branch with the given set. */
    async replaceBranchWarehouses(
        tenantId: string,
        branchId: string,
        warehouseIds: string[],
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.branchWarehouse.deleteMany({ where: { tenantId, branchId } });
            if (warehouseIds.length > 0) {
                await tx.branchWarehouse.createMany({
                    data: warehouseIds.map((warehouseId) => ({ tenantId, branchId, warehouseId })),
                    skipDuplicates: true,
                });
            }
        });
    }

    /** Replaces the branches serving a warehouse with the given set. */
    async replaceWarehouseBranches(
        tenantId: string,
        warehouseId: string,
        branchIds: string[],
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.branchWarehouse.deleteMany({ where: { tenantId, warehouseId } });
            if (branchIds.length > 0) {
                await tx.branchWarehouse.createMany({
                    data: branchIds.map((branchId) => ({ tenantId, branchId, warehouseId })),
                    skipDuplicates: true,
                });
            }
        });
    }

    /** References that make a branch undeletable (deactivate instead). */
    async countReferences(tenantId: string, branchId: string): Promise<BranchReferenceCounts> {
        const [warehouses, cashboxes, documents] = await Promise.all([
            this.prisma.branchWarehouse.count({ where: { tenantId, branchId } }),
            this.prisma.cashbox.count({ where: { tenantId, branchId } }),
            this.prisma.documentSequence.count({ where: { tenantId, branchId } }),
        ]);
        return { warehouses, cashboxes, documents };
    }

    /** Tenant display data used to seed a default `MAIN` branch for a new tenant. */
    async getTenantDefaults(
        tenantId: string,
    ): Promise<{ name: string; address: string | null; phone: string | null } | null> {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, address: true, phone: true },
        });
    }

    /** The id stored in the `defaultBranchId` settings-registry row, or null. */
    async getDefaultBranchId(tenantId: string): Promise<string | null> {
        const row = await this.prisma.tenantSetting.findUnique({
            where: { tenantId_key: { tenantId, key: DEFAULT_BRANCH_SETTING_KEY } },
            select: { value: true },
        });
        return typeof row?.value === 'string' ? row.value : null;
    }
}
