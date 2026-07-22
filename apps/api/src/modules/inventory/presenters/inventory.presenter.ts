import { Injectable } from '@nestjs/common';
import type { Prisma } from '@devloggers/db-prisma';
import { BalanceResponseDto } from '../dto/inventory.dto';

function resolveName(name: Prisma.JsonValue | string): string {
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object' && !Array.isArray(name)) {
        return ((name as any).en as string) || ((name as any).ar as string) || '';
    }
    return '';
}

type BalanceWithRelations = {
    warehouseId: string;
    itemId: string;
    quantity: any;
    averageCost: any;
    updatedAt: Date;
    warehouse: { name: Prisma.JsonValue; code: string };
    item: { name: string; code: string };
};

@Injectable()
export class InventoryPresenter {
    toResponse(balance: BalanceWithRelations): BalanceResponseDto {
        const dto = new BalanceResponseDto();
        dto.warehouseId = balance.warehouseId;
        dto.warehouseName = resolveName(balance.warehouse.name);
        dto.warehouseCode = balance.warehouse.code;
        dto.itemId = balance.itemId;
        dto.itemName = balance.item.name;
        dto.itemCode = balance.item.code;
        dto.quantity = Number(balance.quantity);
        dto.averageCost = Number(balance.averageCost);
        dto.updatedAt = balance.updatedAt.toISOString();
        return dto;
    }

    toResponseList(balances: BalanceWithRelations[]): BalanceResponseDto[] {
        return balances.map((b) => this.toResponse(b));
    }
}
