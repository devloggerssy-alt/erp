import { Injectable } from '@nestjs/common';
import {
    customFieldModules,
    ITEMS_CUSTOM_FIELD_PREFIX,
    ITEMS_IMPORT_COLUMNS,
    type CustomFieldValuesMap,
    type ImportResult,
    type ItemType,
} from '@devloggers/api-contracts';
import type { CustomField, Item } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CustomFieldsRepository } from '@/modules/custom-fields/repositories/custom-fields.repository';
import {
    CrudImportServiceBase,
    normalizeLookupKey,
    parseBooleanCell,
    parseListCell,
    parseNumberCell,
    parseStringCell,
    type ParsedImportRow,
} from '@devloggers/backend-core';
import { ItemsService } from './items.service';
import { CreateItemDto as CreateItemApiDto, UpdateItemDto as UpdateItemApiDto } from '../dto';

const VALID_ITEM_TYPES = new Set<ItemType>(['product', 'service', 'bundle']);

type LookupEntry = { id: string; name: string };

type LookupMaps = {
    categories: Map<string, LookupEntry>;
    units: Map<string, LookupEntry>;
    brands: Map<string, LookupEntry>;
};

type ItemsImportContext = {
    lookupMaps: LookupMaps;
    customFieldDefinitions: CustomField[];
    existingByCode: Map<string, string>;
};

@Injectable()
export class ItemsImportService extends CrudImportServiceBase<
    Item,
    unknown,
    CreateItemApiDto,
    UpdateItemApiDto
> {
    protected readonly resourceKey = 'items';

    constructor(
        itemsService: ItemsService,
        private readonly customFieldsRepository: CustomFieldsRepository,
        private readonly prisma: PrismaService,
    ) {
        super(itemsService);
    }

    override async buildImportContext(tenantId: string): Promise<ItemsImportContext> {
        const [lookupMaps, customFieldDefinitions, existingByCode] = await Promise.all([
            this.buildLookupMaps(tenantId),
            this.customFieldsRepository.findByModule(tenantId, customFieldModules.items),
            this.buildExistingCodeMap(tenantId),
        ]);
        return { lookupMaps, customFieldDefinitions, existingByCode };
    }

    parseRow(
        rawRow: Record<string, unknown>,
        rowNumber: number,
        context: unknown,
        result: ImportResult,
    ): ParsedImportRow<CreateItemApiDto, UpdateItemApiDto> | null {
        const { lookupMaps, customFieldDefinitions, existingByCode } = context as ItemsImportContext;

        const code = parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.code]);
        const name = parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.name]);
        const categoryName = parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.categoryName]);
        const baseUnitName = parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.baseUnitName]);

        if (!code) {
            result.errors.push({ row: rowNumber, field: ITEMS_IMPORT_COLUMNS.code, message: 'Code is required' });
            result.skipped += 1;
            return null;
        }
        if (!name) {
            result.errors.push({ row: rowNumber, field: ITEMS_IMPORT_COLUMNS.name, message: 'Name is required' });
            result.skipped += 1;
            return null;
        }
        if (!categoryName) {
            result.errors.push({ row: rowNumber, field: ITEMS_IMPORT_COLUMNS.categoryName, message: 'Category name is required' });
            result.skipped += 1;
            return null;
        }
        if (!baseUnitName) {
            result.errors.push({ row: rowNumber, field: ITEMS_IMPORT_COLUMNS.baseUnitName, message: 'Base unit name is required' });
            result.skipped += 1;
            return null;
        }

        const category = lookupMaps.categories.get(normalizeLookupKey(categoryName));
        if (!category) {
            result.errors.push({
                row: rowNumber,
                field: ITEMS_IMPORT_COLUMNS.categoryName,
                message: `Category "${categoryName}" not found. Available: ${this.formatLookupHint(lookupMaps.categories)}`,
            });
            result.skipped += 1;
            return null;
        }

        const baseUnit = lookupMaps.units.get(normalizeLookupKey(baseUnitName));
        if (!baseUnit) {
            result.errors.push({
                row: rowNumber,
                field: ITEMS_IMPORT_COLUMNS.baseUnitName,
                message: `Unit "${baseUnitName}" not found. Available: ${this.formatLookupHint(lookupMaps.units)}`,
            });
            result.skipped += 1;
            return null;
        }

        const brandName = parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.brandName]);
        let brandId: string | null = null;
        if (brandName) {
            const brand = lookupMaps.brands.get(normalizeLookupKey(brandName));
            if (!brand) {
                result.errors.push({
                    row: rowNumber,
                    field: ITEMS_IMPORT_COLUMNS.brandName,
                    message: `Brand "${brandName}" not found. Available: ${this.formatLookupHint(lookupMaps.brands)}`,
                });
                result.skipped += 1;
                return null;
            }
            brandId = brand.id;
        }

        const itemTypeRaw = parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.itemType]) ?? 'product';
        if (!VALID_ITEM_TYPES.has(itemTypeRaw as ItemType)) {
            result.errors.push({
                row: rowNumber,
                field: ITEMS_IMPORT_COLUMNS.itemType,
                message: `Invalid item type "${itemTypeRaw}". Use product, service, or bundle.`,
            });
            result.skipped += 1;
            return null;
        }

        const isActive = parseBooleanCell(rawRow[ITEMS_IMPORT_COLUMNS.isActive]) ?? true;
        const customFields = this.parseCustomFields(rawRow, customFieldDefinitions, rowNumber, result);
        if (customFields === null) {
            result.skipped += 1;
            return null;
        }

        const createDto: CreateItemApiDto = {
            code,
            name,
            barcode: parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.barcode]),
            categoryId: category.id,
            baseUnitId: baseUnit.id,
            brandId,
            defaultSellingPrice: parseNumberCell(rawRow[ITEMS_IMPORT_COLUMNS.defaultSellingPrice]),
            latestPurchasePrice: parseNumberCell(rawRow[ITEMS_IMPORT_COLUMNS.latestPurchasePrice]),
            itemType: itemTypeRaw as ItemType,
            mainImageUrl: parseStringCell(rawRow[ITEMS_IMPORT_COLUMNS.mainImageUrl]) ?? null,
            galleryUrls: parseListCell(rawRow[ITEMS_IMPORT_COLUMNS.galleryUrls]),
            customFields,
        };

        const updateDto: UpdateItemApiDto = {
            ...createDto,
            isActive,
        };

        const existingId = existingByCode.get(code.toLowerCase());

        return {
            rowNumber,
            createDto,
            updateDto,
            existingId,
        };
    }

    private async buildLookupMaps(tenantId: string): Promise<LookupMaps> {
        const [categories, units, brands] = await Promise.all([
            this.prisma.itemCategory.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.unit.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true, abbreviation: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.brand.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        const categoryMap = new Map<string, LookupEntry>();
        for (const row of categories) {
            categoryMap.set(normalizeLookupKey(row.name), { id: row.id, name: row.name });
        }

        const unitMap = new Map<string, LookupEntry>();
        for (const row of units) {
            const entry = { id: row.id, name: row.name };
            unitMap.set(normalizeLookupKey(row.name), entry);
            unitMap.set(normalizeLookupKey(row.abbreviation), entry);
        }

        const brandMap = new Map<string, LookupEntry>();
        for (const row of brands) {
            brandMap.set(normalizeLookupKey(row.name), { id: row.id, name: row.name });
        }

        return { categories: categoryMap, units: unitMap, brands: brandMap };
    }

    private formatLookupHint(map: Map<string, LookupEntry>, limit = 5): string {
        const names = [...new Set([...map.values()].map((entry) => entry.name))].slice(0, limit);
        if (names.length === 0) return 'none defined yet';
        const suffix = map.size > limit ? ', …' : '';
        return `${names.join(', ')}${suffix}`;
    }

    private async buildExistingCodeMap(tenantId: string): Promise<Map<string, string>> {
        const items = await this.prisma.item.findMany({
            where: { tenantId },
            select: { id: true, code: true },
        });
        return new Map(items.map((item) => [item.code.toLowerCase(), item.id]));
    }

    private parseCustomFields(
        rawRow: Record<string, unknown>,
        definitions: CustomField[],
        rowNumber: number,
        result: ImportResult,
    ): CustomFieldValuesMap | null | undefined {
        const values: CustomFieldValuesMap = {};
        let hasCustomFieldColumn = false;

        for (const [key, rawValue] of Object.entries(rawRow)) {
            if (!key.startsWith(ITEMS_CUSTOM_FIELD_PREFIX)) continue;
            hasCustomFieldColumn = true;
            const fieldId = key.slice(ITEMS_CUSTOM_FIELD_PREFIX.length);
            const definition = definitions.find((field) => field.id === fieldId);
            if (!definition) {
                result.errors.push({
                    row: rowNumber,
                    field: key,
                    message: `Unknown custom field column "${key}"`,
                });
                return null;
            }

            const text = parseStringCell(rawValue);
            if (!text) continue;

            switch (definition.type) {
                case 'NUMBER': {
                    const num = parseNumberCell(rawValue);
                    if (num === undefined) {
                        result.errors.push({ row: rowNumber, field: key, message: 'Must be a number' });
                        return null;
                    }
                    values[fieldId] = num;
                    break;
                }
                case 'BOOLEAN': {
                    const bool = parseBooleanCell(rawValue);
                    if (bool === undefined) {
                        result.errors.push({ row: rowNumber, field: key, message: 'Must be true or false' });
                        return null;
                    }
                    values[fieldId] = bool;
                    break;
                }
                case 'MULTI_SELECT':
                    values[fieldId] = parseListCell(rawValue, '|');
                    break;
                default:
                    values[fieldId] = text;
            }
        }

        if (!hasCustomFieldColumn) return undefined;
        return values;
    }
}