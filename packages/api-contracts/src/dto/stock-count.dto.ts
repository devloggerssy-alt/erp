import type { StockCountLineDto } from './generated-schemas';

// Stock Count
export interface UpdateStockCountDto {
    notes?: string;
    lines?: StockCountLineDto[];
}
