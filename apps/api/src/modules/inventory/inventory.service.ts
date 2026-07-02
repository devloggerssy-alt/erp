import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { PostOpeningBalanceDto } from './dto/inventory.dto';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';

export interface MovementParams {
    tenantId: string;
    warehouseId: string;
    itemId: string;
    fiscalPeriodId: string;
    movementType: StockMovementType;
    quantity: number; // can be negative for outflows
    unitCost: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    userId: string;
}

export type InventoryTx = {
    stockMovement: { create: (args: any) => Promise<{ id: string }> };
    stockBalance: {
        findUnique: (args: any) => Promise<any>;
        create: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
    };
};

@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryRepository: InventoryRepository,
        private readonly inventoryPresenter: InventoryPresenter,
    ) {}

    /**
     * Transaction-aware core posting engine. Runs inside the caller's $transaction
     * so stock + GL + entity-status changes commit atomically.
     */
    async postMovementTx(tx: InventoryTx, params: MovementParams): Promise<{ id: string }> {
        const movement = await tx.stockMovement.create({
            data: {
                tenantId: params.tenantId,
                warehouseId: params.warehouseId,
                itemId: params.itemId,
                fiscalPeriodId: params.fiscalPeriodId,
                movementType: params.movementType,
                quantity: params.quantity,
                unitCost: params.unitCost,
                referenceType: params.referenceType,
                referenceId: params.referenceId,
                notes: params.notes,
                createdBy: params.userId,
            },
        });

        const balance = await tx.stockBalance.findUnique({
            where: {
                tenantId_warehouseId_itemId: {
                    tenantId: params.tenantId,
                    warehouseId: params.warehouseId,
                    itemId: params.itemId,
                },
            },
        });

        if (!balance) {
            await tx.stockBalance.create({
                data: {
                    tenantId: params.tenantId,
                    warehouseId: params.warehouseId,
                    itemId: params.itemId,
                    quantity: params.quantity,
                    averageCost: params.unitCost,
                },
            });
        } else {
            const newQuantity = Number(balance.quantity) + params.quantity;
            let newAverageCost = Number(balance.averageCost);
            if (params.quantity > 0) {
                const totalValue = (Number(balance.quantity) * Number(balance.averageCost)) + (params.quantity * params.unitCost);
                newAverageCost = totalValue / newQuantity;
            }
            await tx.stockBalance.update({
                where: { id: balance.id },
                data: { quantity: newQuantity, averageCost: newAverageCost },
            });
        }

        return movement;
    }

    /** Standalone entry point — wraps postMovementTx in its own transaction. */
    async postMovement(params: MovementParams) {
        return this.prisma.$transaction((tx) => this.postMovementTx(tx as unknown as InventoryTx, params));
    }

    async registerOpeningBalance(tenantId: string, userId: string, dto: PostOpeningBalanceDto) {
        const results: any[] = [];
        // We run all opening balances for a warehouse in a single transaction if possible
        // but for simplicity and error reporting, we leverage postMovement.
        for (const item of dto.items) {
            const res = await this.postMovement({
                tenantId,
                userId,
                warehouseId: dto.warehouseId,
                itemId: item.itemId,
                fiscalPeriodId: dto.fiscalPeriodId,
                movementType: StockMovementType.OPENING,
                quantity: item.quantity,
                unitCost: item.unitCost,
                notes: 'Opening Balance Registration',
            });
            results.push(res);
        }
        return results;
    }

    async getBalances(tenantId: string, filters: { warehouseId?: string; itemId?: string }) {
        const balances = await this.inventoryRepository.getBalances(tenantId, filters);
        return this.inventoryPresenter.toResponseList(balances);
    }
}
