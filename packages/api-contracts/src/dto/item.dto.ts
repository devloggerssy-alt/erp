import type { CustomFieldValuesMap } from './custom-field.dto';

export type ItemType = 'product' | 'service' | 'vehicle' | 'bundle'

export interface CreateItemDto {
    code: string;
    name: string;
    barcode?: string;
    categoryId: string;
    baseUnitId: string;
    defaultSellingPrice?: number;
    latestPurchasePrice?: number;
    customFields?: CustomFieldValuesMap;
    /** @default 'product' */
    itemType?: ItemType;
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
    customFields?: CustomFieldValuesMap;
    itemType?: ItemType;
}

export interface ItemResponseDto {
    id: string;
    code: string;
    name: string;
    barcode: string | null;
    categoryId: string;
    baseUnitId: string;
    defaultSellingPrice: number | null;
    latestPurchasePrice: number | null;
    isActive: boolean;
    customFields: CustomFieldValuesMap;
    itemType: ItemType;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateItemStatusDto {
    isActive: boolean;
}
