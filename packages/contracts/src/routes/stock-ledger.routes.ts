export const STOCK_LEDGER = {
    ROOT: "stock-ledger",
    MOVEMENTS: "stock-ledger/movements",
    BY_ITEM: "stock-ledger/movements/by-item/:itemId",
    BY_WAREHOUSE: "stock-ledger/movements/by-warehouse/:warehouseId",
} as const;
