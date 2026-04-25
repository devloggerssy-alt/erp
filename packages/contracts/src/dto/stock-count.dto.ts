// Stock Count
export interface StockCountLineDto {
    itemId: string;
    countedQuantity: number;
    notes?: string;
}

export interface CreateStockCountDto {
    date: string;
    warehouseId: string;
    fiscalPeriodId: string;
    notes?: string;
    lines: StockCountLineDto[];
}

export interface UpdateStockCountDto {
    notes?: string;
    lines?: StockCountLineDto[];
}
