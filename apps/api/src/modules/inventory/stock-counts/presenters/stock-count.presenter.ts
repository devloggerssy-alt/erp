import { Injectable } from '@nestjs/common';
import { StockCountResponseDto, StockCountLineResponseDto } from '../dto/stock-count.dto';
import type { StockCountDetail, StockCountListItem, StockCountWithLines } from '../stock-count-includes';

type Decimal = { toNumber(): number } | number;
const toNum = (d: Decimal) => (typeof d === 'object' ? d.toNumber() : d);

/**
 * Every shape the presenter receives: the list load, the full detail load, and
 * the partial `{ warehouse, lines }` load returned by create/post. Relations
 * that exist only on some shapes are reached behind `in` guards.
 */
export type StockCountEntity = StockCountListItem | StockCountDetail | StockCountWithLines;

@Injectable()
export class StockCountPresenter {
    toListResponse(entity: StockCountEntity): StockCountResponseDto {
        return {
            id: entity.id,
            number: entity.number,
            date: entity.date instanceof Date ? entity.date.toISOString() : String(entity.date),
            warehouseId: entity.warehouseId,
            // warehouse.name is a LocalizedString ({ ar, en }); the raw value is emitted unchanged here.
            warehouseName: entity.warehouse.name as string,
            fiscalPeriodId: entity.fiscalPeriodId,
            status: entity.status,
            notes: entity.notes ?? null,
            postedAt: entity.postedAt ? new Date(entity.postedAt).toISOString() : null,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
            lineCount: '_count' in entity ? entity._count.lines : undefined,
        };
    }

    toDetailResponse(entity: StockCountDetail | StockCountWithLines): StockCountResponseDto {
        const lines: StockCountLineResponseDto[] = entity.lines.map((line) => ({
            id: line.id,
            itemId: line.itemId,
            itemName: 'item' in line ? line.item.name : undefined,
            itemCode: 'item' in line ? line.item.code : undefined,
            systemQuantity: toNum(line.systemQuantity),
            countedQuantity: toNum(line.countedQuantity),
            difference: toNum(line.difference),
            notes: line.notes ?? null,
        }));

        return {
            ...this.toListResponse(entity),
            lines,
        };
    }

    toListResponseList(entities: StockCountEntity[]): StockCountResponseDto[] {
        return entities.map((e) => this.toListResponse(e));
    }
}
