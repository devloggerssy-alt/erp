import { Injectable } from '@nestjs/common';
import { StockMovementResponseDto } from '../dto/stock-ledger.dto';

type StockMovementWithRelations = {
    id: string;
    warehouseId: string;
    itemId: string;
    fiscalPeriodId: string;
    movementType: string;
    quantity: { toNumber(): number } | number;
    unitCost: { toNumber(): number } | number;
    referenceType: string | null;
    referenceId: string | null;
    notes: string | null;
    createdAt: Date;
    warehouse: { name: string; code: string } | null;
    item: { name: string; code: string } | null;
    fiscalPeriod: { name: string } | null;
};

@Injectable()
export class StockMovementPresenter {
    toResponse(entity: StockMovementWithRelations): StockMovementResponseDto {
        const quantity = typeof entity.quantity === 'object' ? entity.quantity.toNumber() : entity.quantity;
        const unitCost = typeof entity.unitCost === 'object' ? entity.unitCost.toNumber() : entity.unitCost;

        return {
            id: entity.id,
            warehouseId: entity.warehouseId,
            warehouseName: entity.warehouse?.name ?? null,
            itemId: entity.itemId,
            itemName: entity.item?.name ?? null,
            itemCode: entity.item?.code ?? null,
            fiscalPeriodId: entity.fiscalPeriodId,
            fiscalPeriodName: entity.fiscalPeriod?.name,
            movementType: entity.movementType,
            quantity,
            unitCost,
            referenceType: entity.referenceType,
            referenceId: entity.referenceId,
            notes: entity.notes,
            createdAt: entity.createdAt.toISOString(),
        };
    }

    toResponseList(entities: StockMovementWithRelations[]): StockMovementResponseDto[] {
        return entities.map((e) => this.toResponse(e));
    }
}
