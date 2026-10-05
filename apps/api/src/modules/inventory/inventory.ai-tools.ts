import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { InventoryService } from './inventory.service';

const MAX_ROWS = 50;

export class AiStockBalancesDto {
    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this warehouse (id from warehouses.list)' })
    @IsOptional()
    @IsUUID()
    warehouseId?: string;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this item (id from items.list)' })
    @IsOptional()
    @IsUUID()
    itemId?: string;
}

@AiToolProvider()
@Injectable()
export class InventoryAiTools implements AiToolSource {
    constructor(private readonly inventory: InventoryService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'stock.balances',
                domain: 'inventory',
                resource: resources.inventory.key,
                risk: 'read',
                permission: 'inventory.view',
                description:
                    `Current stock quantity and average cost per item and warehouse. Returns { items, total }; at most ${MAX_ROWS} rows — ` +
                    'filter by warehouseId or itemId to narrow it.',
                input: dtoInput(AiStockBalancesDto),
                handler: async (ctx, input) => {
                    const rows = await this.inventory.getBalances(ctx.tenantId, { warehouseId: input.warehouseId, itemId: input.itemId });
                    return { items: rows.slice(0, MAX_ROWS), total: rows.length };
                },
            }),
        ];
    }
}
