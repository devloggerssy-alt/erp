/** Stable column keys for items Excel import/export (row 1 headers). */
export const ITEMS_IMPORT_COLUMNS = {
    code: 'code',
    name: 'name',
    barcode: 'barcode',
    categoryName: 'category_name',
    baseUnitName: 'base_unit_name',
    brandName: 'brand_name',
    itemType: 'item_type',
    defaultSellingPrice: 'default_selling_price',
    latestPurchasePrice: 'latest_purchase_price',
    isActive: 'is_active',
    mainImageUrl: 'main_image_url',
    galleryUrls: 'gallery_urls',
} as const;

export const ITEMS_BASE_COLUMN_KEYS = Object.values(ITEMS_IMPORT_COLUMNS);

export const ITEMS_CUSTOM_FIELD_PREFIX = 'cf:';

export const ITEMS_EXPORT_MAX_ROWS = 10_000;

export const ITEMS_INSTRUCTIONS = [
    { column: ITEMS_IMPORT_COLUMNS.code, description: 'Required. Unique item code within your tenant. Used for upsert on import.' },
    { column: ITEMS_IMPORT_COLUMNS.name, description: 'Required. Item display name.' },
    { column: ITEMS_IMPORT_COLUMNS.barcode, description: 'Optional barcode / EAN.' },
    { column: ITEMS_IMPORT_COLUMNS.categoryName, description: 'Required. Must match an existing category name exactly.' },
    { column: ITEMS_IMPORT_COLUMNS.baseUnitName, description: 'Required. Must match an existing unit name exactly.' },
    { column: ITEMS_IMPORT_COLUMNS.brandName, description: 'Optional. Must match an existing brand name exactly.' },
    { column: ITEMS_IMPORT_COLUMNS.itemType, description: 'Optional. product | service | bundle. Defaults to product.' },
    { column: ITEMS_IMPORT_COLUMNS.defaultSellingPrice, description: 'Optional decimal selling price.' },
    { column: ITEMS_IMPORT_COLUMNS.latestPurchasePrice, description: 'Optional decimal purchase price.' },
    { column: ITEMS_IMPORT_COLUMNS.isActive, description: 'Optional. true/false, yes/no, or 1/0. Defaults to true.' },
    { column: ITEMS_IMPORT_COLUMNS.mainImageUrl, description: 'Optional main image URL.' },
    { column: ITEMS_IMPORT_COLUMNS.galleryUrls, description: 'Optional gallery URLs separated by | (pipe).' },
    { column: `${ITEMS_CUSTOM_FIELD_PREFIX}<fieldId>`, description: 'Optional custom field columns. Header format: cf:<uuid> (see export for your tenant field IDs).' },
] as const;
