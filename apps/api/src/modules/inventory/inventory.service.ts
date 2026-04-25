import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { PostOpeningBalanceDto } from './dto/inventory.dto';

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

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * The core Posting Engine.
     * Atomically creates a movement and updates the balance projection.
     */
    async postMovement(params: MovementParams) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create the Movement record (the Audit Trail)
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

            // 2. Update the Balance projection
            // We use upsert to handle the first time an item enters a warehouse
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
                // First time: initial quantity and cost
                await tx.stockBalance.create({
                    data: {
                        tenantId: params.tenantId,
                        warehouseId: params.warehouseId,
                        itemId: params.itemId,
                        quantity: params.quantity,
                        averageCost: params.unitCost, // Initial average cost
                    },
                });
            } else {
                const newQuantity = Number(balance.quantity) + params.quantity;
                
                // Average conversion logic (simplified for MVP)
                // In a real system, we'd handle complex COGS logic here.
                // For now, if it's an inflow, we recalculate average.
                let newAverageCost = Number(balance.averageCost);
                if (params.quantity > 0) {
                    const totalValue = (Number(balance.quantity) * Number(balance.averageCost)) + (params.quantity * params.unitCost);
                    newAverageCost = totalValue / newQuantity;
                }

                await tx.stockBalance.update({
                    where: { id: balance.id },
                    data: {
                        quantity: newQuantity,
                        averageCost: newAverageCost,
                    },
                });
            }

            return movement;
        });
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
        const where: any = { tenantId };
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.itemId) where.itemId = filters.itemId;

        return this.prisma.stockBalance.findMany({
            where,
            include: {
                warehouse: { select: { name: true, code: true } },
                item: { select: { name: true, code: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
}
