import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../inventory/inventory.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';

@Injectable()
export class StockCountsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly docSeqService: DocumentSequencesService,
    ) {}

    async findAll(tenantId: string, page = 1, limit = 50) {
        const [data, total] = await Promise.all([
            this.prisma.stockCount.findMany({
                where: { tenantId },
                include: {
                    warehouse: { select: { name: true, code: true } },
                    _count: { select: { lines: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.stockCount.count({ where: { tenantId } }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const count = await this.prisma.stockCount.findFirst({
            where: { id, tenantId },
            include: {
                warehouse: true,
                lines: { include: { item: { select: { name: true, code: true } } } },
            },
        });
        if (!count) throw new NotFoundException('Stock count not found');
        return count;
    }

    async create(tenantId: string, userId: string, dto: {
        date: string; warehouseId: string; fiscalPeriodId: string; notes?: string;
        lines: { itemId: string; countedQuantity: number; notes?: string }[];
    }) {
        const number = await this.docSeqService.getNextNumber(tenantId, 'STOCK_COUNT');

        // Fetch system quantities for each item in the warehouse
        const processedLines = await Promise.all(dto.lines.map(async (line) => {
            const balance = await this.prisma.stockBalance.findUnique({
                where: {
                    tenantId_warehouseId_itemId: {
                        tenantId,
                        warehouseId: dto.warehouseId,
                        itemId: line.itemId,
                    },
                },
            });
            const systemQty = balance ? Number(balance.quantity) : 0;
            const difference = line.countedQuantity - systemQty;
            return {
                tenantId,
                itemId: line.itemId,
                systemQuantity: systemQty,
                countedQuantity: line.countedQuantity,
                difference,
                notes: line.notes,
            };
        }));

        return this.prisma.stockCount.create({
            data: {
                tenantId,
                number,
                date: new Date(dto.date),
                warehouseId: dto.warehouseId,
                fiscalPeriodId: dto.fiscalPeriodId,
                notes: dto.notes,
                createdBy: userId,
                lines: { create: processedLines },
            },
            include: { lines: true },
        });
    }

    async post(tenantId: string, id: string, userId: string) {
        const stockCount = await this.findById(tenantId, id);
        if (stockCount.status !== 'DRAFT') throw new BadRequestException('Only draft stock counts can be posted');

        // Create adjustment movements for lines with a difference
        for (const line of stockCount.lines) {
            const diff = Number(line.difference);
            if (diff !== 0) {
                await this.inventoryService.postMovement({
                    tenantId,
                    warehouseId: stockCount.warehouseId,
                    itemId: line.itemId,
                    fiscalPeriodId: stockCount.fiscalPeriodId,
                    movementType: StockMovementType.STOCK_COUNT,
                    quantity: diff,
                    unitCost: 0, // Cost not tracked on adjustments in MVP
                    referenceType: 'stock_count',
                    referenceId: id,
                    notes: `Stock count adjustment: ${stockCount.number}`,
                    userId,
                });
            }
        }

        return this.prisma.stockCount.update({
            where: { id },
            data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
        });
    }
}
