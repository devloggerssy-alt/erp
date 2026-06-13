import type { CustomFieldValuesMap } from './custom-field.dto';

export type ItemType = 'product' | 'service' | 'vehicle' | 'bundle'

export interface CreateItemDto {
    code: string;
    name: string;
    barcode?: string;
    categoryId: string;
    baseUnitId: string;
    brandId?: string | null;
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
    brandId?: string | null;
    defaultSellingPrice?: number;
    latestPurchasePrice?: number;
    isActive?: boolean;
    customFields?: CustomFieldValuesMap;
    itemType?: ItemType;
}

export interface ItemCategorySummary {
    id: string;
    name: string;
}

export interface ItemBaseUnitSummary {
    id: string;
    name: string;
    abbreviation: string;
}

export interface ItemBrandSummary {
    id: string;
    name: string;
    imageUrl: string | null;
}

export interface ItemResponseDto {
    id: string;
    code: string;
    name: string;
    barcode: string | null;
    categoryId: string;
    baseUnitId: string;
    brandId: string | null;
    /** Populated in show (GET /:id) responses only */
    category?: ItemCategorySummary | null;
    /** Populated in show (GET /:id) responses only */
    baseUnit?: ItemBaseUnitSummary | null;
    /** Populated in show (GET /:id) responses only */
    brand?: ItemBrandSummary | null;
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
