export interface CreateItemDto {
    code: string;
    name: string;
    barcode?: string;
    categoryId: string;
    baseUnitId: string;
    defaultSellingPrice?: number;
    latestPurchasePrice?: number;
}

export interface UpdateItemDto {
    code?: string;
    name?: string;
    barcode?: string;
    categoryId?: string;
    baseUnitId?: string;
    defaultSellingPrice?: number;
    latestPurchasePrice?: number;
    isActive?: boolean;
}

export interface UpdateItemStatusDto {
    isActive: boolean;
}
