export const INVENTORY = {
    ROOT: "inventory",
    BALANCES: "inventory/balances",
    BY_WAREHOUSE: "inventory/balances/by-warehouse/:warehouseId",
    BY_ITEM: "inventory/balances/by-item/:itemId",
    OPENING_BALANCES: "inventory/opening-balances",
} as const;
