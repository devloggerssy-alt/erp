import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { StockMovementType } from '@devloggers/db-prisma';
import { AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { StockLedgerService } from './stock-ledger.service';

const DEFAULT_LIMIT = 20;
const MOVEMENT_TYPES = Object.values(StockMovementType);

export class AiStockMovementsDto extends AiPageDto {
    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this warehouse' })
    @IsOptional()
    @IsUUID()
    warehouseId?: string;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this item' })
    @IsOptional()
    @IsUUID()
    itemId?: string;

    @ApiPropertyOptional({ enum: MOVEMENT_TYPES, description: 'Movement type' })
    @IsOptional()
    @IsIn(MOVEMENT_TYPES)
    movementType?: StockMovementType;
}

@AiToolProvider()
@Injectable()
export class StockLedgerAiTools implements AiToolSource {
    constructor(private readonly ledger: StockLedgerService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'stock.movements',
                domain: 'inventory',
                resource: resources.stockLedger.key,
                risk: 'read',
                permission: 'stockLedger.view',
                description: 'Stock movements (newest first): purchases, sales, adjustments, counts, transfers. Returns { items, total, page }.',
                input: dtoInput(AiStockMovementsDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const result = await this.ledger.findMovements(ctx.tenantId, {
                        warehouseId: input.warehouseId,
                        itemId: input.itemId,
                        movementType: input.movementType,
                        page,
                        limit: input.limit ?? DEFAULT_LIMIT,
                    });
                    return {
                        items: result.data.map((m) => ({
                            id: m.id,
                            date: m.createdAt,
                            movementType: m.movementType,
                            itemName: m.itemName,
                            itemCode: m.itemCode,
                            warehouseName: m.warehouseName,
                            quantity: m.quantity,
                            unitCost: m.unitCost,
                            referenceType: m.referenceType,
                        })),
                        total: result.total,
                        page,
                    };
                },
            }),
        ];
    }
}
