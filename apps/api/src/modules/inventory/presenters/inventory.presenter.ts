import { Injectable } from '@nestjs/common';
import { BalanceResponseDto } from '../dto/inventory.dto';

type BalanceWithRelations = {
    warehouseId: string;
    itemId: string;
    quantity: any;
    averageCost: any;
    updatedAt: Date;
    warehouse: { name: string; code: string };
    item: { name: string; code: string };
};

@Injectable()
export class InventoryPresenter {
    toResponse(balance: BalanceWithRelations): BalanceResponseDto {
        const dto = new BalanceResponseDto();
        dto.warehouseId = balance.warehouseId;
        dto.warehouseName = balance.warehouse.name;
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
