import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../inventory.service';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { StockCountsRepository } from './repositories/stock-counts.repository';
import { StockCountPresenter } from './presenters/stock-count.presenter';
import { StockCountCreatedEvent, StockCountPostedEvent } from './events/stock-count.events';

@Injectable()
export class StockCountsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly stockCountsRepository: StockCountsRepository,
        private readonly stockCountPresenter: StockCountPresenter,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async findAll(tenantId: string, page = 1, limit = 50) {
        const result = await this.stockCountsRepository.findAll(tenantId, page, limit);
        return {
            data: this.stockCountPresenter.toListResponseList(result.data),
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }

    async findById(tenantId: string, id: string) {
        const count = await this.stockCountsRepository.findById(tenantId, id);
        if (!count) throw new NotFoundException('Stock count not found');
        return this.stockCountPresenter.toDetailResponse(count);
    }

    async create(tenantId: string, userId: string, dto: {
        date: string; warehouseId: string; fiscalPeriodId: string; notes?: string;
        lines: { itemId: string; countedQuantity: number; notes?: string }[];
    }) {
        const number = await this.docSeqService.getNextNumber(tenantId, 'STOCK_COUNT');

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

        const created = await this.prisma.stockCount.create({
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
            include: { lines: true, warehouse: true },
        });

        this.eventEmitter.emit(StockCountCreatedEvent.NAME, new StockCountCreatedEvent(tenantId, 'stock-count', created as any));
        return this.stockCountPresenter.toDetailResponse(created);
    }

    async post(tenantId: string, id: string, userId: string) {
        const stockCount = await this.stockCountsRepository.findById(tenantId, id);
        if (!stockCount) throw new NotFoundException('Stock count not found');
        if (stockCount.status !== 'DRAFT') throw new BadRequestException('Only draft stock counts can be posted');

        const itemTypes = await this.prisma.item.findMany({
            where: { tenantId, id: { in: stockCount.lines.map(l => l.itemId) } },
            select: { id: true, itemType: true },
        });
        const itemTypeMap = new Map(itemTypes.map(i => [i.id, i.itemType]));

        for (const line of stockCount.lines) {
            const diff = Number(line.difference);
            if (diff !== 0 && itemTypeMap.get(line.itemId) !== 'service') {
                await this.inventoryService.postMovement({
                    tenantId,
                    warehouseId: stockCount.warehouseId,
                    itemId: line.itemId,
                    fiscalPeriodId: stockCount.fiscalPeriodId,
                    movementType: StockMovementType.STOCK_COUNT,
                    quantity: diff,
                    unitCost: 0,
                    referenceType: 'stock_count',
                    referenceId: id,
                    notes: `Stock count adjustment: ${stockCount.number}`,
                    userId,
                });
            }
        }

        const updated = await this.prisma.stockCount.update({
            where: { id },
            data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
            include: { lines: true, warehouse: true },
        });

        this.eventEmitter.emit(StockCountPostedEvent.NAME, new StockCountPostedEvent(tenantId, 'stock-count', updated as any, stockCount as any));
        return this.stockCountPresenter.toDetailResponse(updated);
    }
}
