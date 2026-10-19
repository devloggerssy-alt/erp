import { Injectable } from '@nestjs/common';
import type { Prisma } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { StockMovementResponseDto } from '../dto/stock-ledger.dto';
import type { StockMovementWithRelations } from '../repositories/stock-ledger.repository';

function resolveName(name: Prisma.JsonValue | string | null | undefined): string | null {
    if (!name) return null;
    if (typeof name === 'string') return name;
    const localized = toLocalizedString(name);
    return localized?.en || localized?.ar || null;
}

@Injectable()
export class StockMovementPresenter {
    toResponse(entity: StockMovementWithRelations): StockMovementResponseDto {
        const quantity = typeof entity.quantity === 'object' ? entity.quantity.toNumber() : entity.quantity;
        const unitCost = typeof entity.unitCost === 'object' ? entity.unitCost.toNumber() : entity.unitCost;

        return {
            id: entity.id,
            warehouseId: entity.warehouseId,
            warehouseName: entity.warehouse ? resolveName(entity.warehouse.name) : null,
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
