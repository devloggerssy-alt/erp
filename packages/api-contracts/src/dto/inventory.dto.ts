export interface CreateStockMovementDto {
    warehouseId: string;
    itemId: string;
    quantity: number;
    unitCost?: number;
    movementType: 'OPENING' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'STOCK_COUNT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
    fiscalPeriodId: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
}

export interface PostOpeningBalanceDto {
    fiscalPeriodId: string;
    warehouseId: string;
    items: {
        itemId: string;
        quantity: number;
        unitCost: number;
    }[];
}

export interface StockBalanceResponse {
    warehouseId: string;
    itemId: string;
    quantity: number;
    averageCost: number;
    warehouseName: string;
    itemName: string;
    itemCode: string;
}
