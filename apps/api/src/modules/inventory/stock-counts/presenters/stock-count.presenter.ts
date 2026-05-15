import { Injectable } from '@nestjs/common';
import { StockCountResponseDto, StockCountLineResponseDto } from '../dto/stock-count.dto';

type Decimal = { toNumber(): number } | number;
const toNum = (d: Decimal) => (typeof d === 'object' ? d.toNumber() : d);

@Injectable()
export class StockCountPresenter {
    toListResponse(entity: any): StockCountResponseDto {
        return {
            id: entity.id,
            number: entity.number,
            date: entity.date instanceof Date ? entity.date.toISOString() : String(entity.date),
            warehouseId: entity.warehouseId,
            warehouseName: entity.warehouse?.name,
            fiscalPeriodId: entity.fiscalPeriodId,
            status: entity.status,
            notes: entity.notes ?? null,
            postedAt: entity.postedAt ? new Date(entity.postedAt).toISOString() : null,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
            lineCount: entity._count?.lines,
        };
    }

    toDetailResponse(entity: any): StockCountResponseDto {
        const lines: StockCountLineResponseDto[] = (entity.lines ?? []).map((line: any) => ({
            id: line.id,
            itemId: line.itemId,
            itemName: line.item?.name,
            itemCode: line.item?.code,
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

    toListResponseList(entities: any[]): StockCountResponseDto[] {
        return entities.map((e) => this.toListResponse(e));
    }
}
