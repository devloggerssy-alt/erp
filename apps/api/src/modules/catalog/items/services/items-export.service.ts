import { Injectable } from '@nestjs/common';
import {
    type SheetColumn,
    type WorkbookSheet,
} from '@devloggers/import-export';
import {
    customFieldModules,
    ITEMS_CUSTOM_FIELD_PREFIX,
    ITEMS_EXPORT_MAX_ROWS,
    ITEMS_IMPORT_COLUMNS,
    ITEMS_INSTRUCTIONS,
} from '@devloggers/api-contracts';
import type { CustomFieldValuesMap } from '@devloggers/api-contracts';
import type { CustomField } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CustomFieldsRepository } from '@/modules/custom-fields/repositories/custom-fields.repository';
import { CustomFieldValuesService } from '@/modules/custom-fields/services/custom-field-values.service';
import {
    CrudExportServiceBase,
    type ExportRow,
    type FindManyOptions,
} from '@devloggers/backend-core';
import { ItemsRepository, type ItemWithListRelations } from '../repositories/items.repository';
import { ItemPresenter } from '../presenters/item.presenter';

type ItemsExportContext = {
    customFieldDefinitions: CustomField[];
    customFieldsByItem: Record<string, CustomFieldValuesMap>;
    categories?: Array<{ name: string }>;
    units?: Array<{ name: string; abbreviation: string }>;
    brands?: Array<{ name: string }>;
};

@Injectable()
export class ItemsExportService extends CrudExportServiceBase<ItemWithListRelations> {
    protected readonly resourceKey = 'items';

    constructor(
        private readonly itemsRepository: ItemsRepository,
        private readonly itemPresenter: ItemPresenter,
        private readonly customFieldsRepository: CustomFieldsRepository,
        private readonly customFieldValuesService: CustomFieldValuesService,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    override getExportMaxRows(): number {
        return ITEMS_EXPORT_MAX_ROWS;
    }

    override getExportOrderBy(): Record<string, 'asc' | 'desc'> {
        return { code: 'asc' };
    }

    override async fetchExportRows(
        tenantId: string,
        options: FindManyOptions,
    ): Promise<ItemWithListRelations[]> {
        const result = await this.itemsRepository.findManyWithRelations(tenantId, options);
        return result.data;
    }

    override async buildExportContext(
        tenantId: string,
        entities: ItemWithListRelations[],
    ): Promise<ItemsExportContext> {
        const [customFieldDefinitions, customFieldsByItem] = await Promise.all([
            this.customFieldsRepository.findByModule(tenantId, customFieldModules.items),
            this.customFieldValuesService.getForEntities(
                tenantId,
                customFieldModules.items,
                entities.map((item) => item.id),
            ),
        ]);
        return { customFieldDefinitions, customFieldsByItem };
    }

    override getColumns(
        _tenantId: string,
        context: unknown,
    ): Promise<SheetColumn[]> {
        const { customFieldDefinitions } = context as ItemsExportContext;
        return Promise.resolve(this.buildColumns(customFieldDefinitions ?? []));
    }

    override toExportRow(entity: ItemWithListRelations, context: unknown): ExportRow {
        const { customFieldDefinitions, customFieldsByItem } = context as ItemsExportContext;
        const response = this.itemPresenter.toResponse(entity);
        const customFields = customFieldsByItem?.[entity.id] ?? {};
        return this.toExportRowInternal(response, entity, customFields, customFieldDefinitions ?? []);
    }

    getInstructions() {
        return [...ITEMS_INSTRUCTIONS];
    }

    override async buildTemplateContext(tenantId: string): Promise<ItemsExportContext> {
        const [customFieldDefinitions, categories, units, brands] = await Promise.all([
            this.customFieldsRepository.findByModule(tenantId, customFieldModules.items),
            this.prisma.itemCategory.findMany({
                where: { tenantId, isActive: true },
                select: { name: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.unit.findMany({
                where: { tenantId, isActive: true },
                select: { name: true, abbreviation: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.brand.findMany({
                where: { tenantId, isActive: true },
                select: { name: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        return { customFieldDefinitions, customFieldsByItem: {}, categories, units, brands };
    }

    override buildTemplateExampleRow(
        _tenantId: string,
        context: unknown,
    ): Promise<ExportRow | null> {
        const { customFieldDefinitions, categories, units, brands } = context as ItemsExportContext;
        if (!categories?.[0] || !units?.[0]) return Promise.resolve(null);
        return Promise.resolve(
            this.buildExampleRow(
                customFieldDefinitions ?? [],
                categories[0].name,
                units[0].name,
                brands?.[0]?.name ?? '',
            ),
        );
    }

    override getTemplateExtraSheets(
        _tenantId: string,
        context: unknown,
    ): Promise<WorkbookSheet[]> {
        const { categories, units, brands } = context as ItemsExportContext;
        return Promise.resolve([this.buildLookupsSheet(categories ?? [], units ?? [], brands ?? [])]);
    }

    private buildLookupsSheet(
        categories: Array<{ name: string }>,
        units: Array<{ name: string; abbreviation: string }>,
        brands: Array<{ name: string }>,
    ): WorkbookSheet {
        const maxRows = Math.max(categories.length, units.length, brands.length, 1);
        const rows: Record<string, string>[] = [];

        for (let index = 0; index < maxRows; index++) {
            rows.push({
                category_name: categories[index]?.name ?? '',
                base_unit_name: units[index]?.name ?? '',
                unit_abbreviation: units[index]?.abbreviation ?? '',
                brand_name: brands[index]?.name ?? '',
            });
        }

        return {
            name: 'Lookups',
            columns: [
                { key: 'category_name', header: 'category_name', width: 24 },
                { key: 'base_unit_name', header: 'base_unit_name', width: 20 },
                { key: 'unit_abbreviation', header: 'unit_abbreviation', width: 18 },
                { key: 'brand_name', header: 'brand_name', width: 20 },
            ],
            rows,
        };
    }

    private buildColumns(customFieldDefinitions: CustomField[]): SheetColumn[] {
        const baseColumns: SheetColumn[] = [
            { key: ITEMS_IMPORT_COLUMNS.code, header: ITEMS_IMPORT_COLUMNS.code, width: 16 },
            { key: ITEMS_IMPORT_COLUMNS.name, header: ITEMS_IMPORT_COLUMNS.name, width: 28 },
            { key: ITEMS_IMPORT_COLUMNS.barcode, header: ITEMS_IMPORT_COLUMNS.barcode, width: 18 },
            { key: ITEMS_IMPORT_COLUMNS.categoryName, header: ITEMS_IMPORT_COLUMNS.categoryName, width: 22 },
            { key: ITEMS_IMPORT_COLUMNS.baseUnitName, header: ITEMS_IMPORT_COLUMNS.baseUnitName, width: 18 },
            { key: ITEMS_IMPORT_COLUMNS.brandName, header: ITEMS_IMPORT_COLUMNS.brandName, width: 18 },
            { key: ITEMS_IMPORT_COLUMNS.itemType, header: ITEMS_IMPORT_COLUMNS.itemType, width: 14 },
            { key: ITEMS_IMPORT_COLUMNS.defaultSellingPrice, header: ITEMS_IMPORT_COLUMNS.defaultSellingPrice, width: 18 },
            { key: ITEMS_IMPORT_COLUMNS.latestPurchasePrice, header: ITEMS_IMPORT_COLUMNS.latestPurchasePrice, width: 18 },
            { key: ITEMS_IMPORT_COLUMNS.isActive, header: ITEMS_IMPORT_COLUMNS.isActive, width: 12 },
            { key: ITEMS_IMPORT_COLUMNS.mainImageUrl, header: ITEMS_IMPORT_COLUMNS.mainImageUrl, width: 36 },
            { key: ITEMS_IMPORT_COLUMNS.galleryUrls, header: ITEMS_IMPORT_COLUMNS.galleryUrls, width: 36 },
        ];

        const customColumns = customFieldDefinitions.map((field) => ({
            key: `${ITEMS_CUSTOM_FIELD_PREFIX}${field.id}`,
            header: `${ITEMS_CUSTOM_FIELD_PREFIX}${field.id}`,
            width: 20,
        }));

        return [...baseColumns, ...customColumns];
    }

    private toExportRowInternal(
        response: ReturnType<ItemPresenter['toResponse']>,
        entity: { category: { name: string }; baseUnit: { name: string }; brand?: { name: string } | null },
        customFields: CustomFieldValuesMap,
        customFieldDefinitions: CustomField[],
    ): ExportRow {
        const row: ExportRow = {
            [ITEMS_IMPORT_COLUMNS.code]: response.code,
            [ITEMS_IMPORT_COLUMNS.name]: response.name,
            [ITEMS_IMPORT_COLUMNS.barcode]: response.barcode ?? '',
            [ITEMS_IMPORT_COLUMNS.categoryName]: entity.category.name,
            [ITEMS_IMPORT_COLUMNS.baseUnitName]: entity.baseUnit.name,
            [ITEMS_IMPORT_COLUMNS.brandName]: entity.brand?.name ?? '',
            [ITEMS_IMPORT_COLUMNS.itemType]: response.itemType,
            [ITEMS_IMPORT_COLUMNS.defaultSellingPrice]: response.defaultSellingPrice ?? '',
            [ITEMS_IMPORT_COLUMNS.latestPurchasePrice]: response.latestPurchasePrice ?? '',
            [ITEMS_IMPORT_COLUMNS.isActive]: response.isActive,
            [ITEMS_IMPORT_COLUMNS.mainImageUrl]: response.mainImageUrl ?? '',
            [ITEMS_IMPORT_COLUMNS.galleryUrls]: response.galleryUrls.join('|'),
        };

        for (const field of customFieldDefinitions) {
            const value = customFields[field.id];
            row[`${ITEMS_CUSTOM_FIELD_PREFIX}${field.id}`] = this.formatCustomFieldValue(value);
        }

        return row;
    }

    private buildExampleRow(
        customFieldDefinitions: CustomField[],
        categoryName: string,
        baseUnitName: string,
        brandName: string,
    ): ExportRow {
        const row: ExportRow = {
            [ITEMS_IMPORT_COLUMNS.code]: 'ITEM-001',
            [ITEMS_IMPORT_COLUMNS.name]: 'Sample Item',
            [ITEMS_IMPORT_COLUMNS.barcode]: '',
            [ITEMS_IMPORT_COLUMNS.categoryName]: categoryName,
            [ITEMS_IMPORT_COLUMNS.baseUnitName]: baseUnitName,
            [ITEMS_IMPORT_COLUMNS.brandName]: brandName,
            [ITEMS_IMPORT_COLUMNS.itemType]: 'product',
            [ITEMS_IMPORT_COLUMNS.defaultSellingPrice]: 100,
            [ITEMS_IMPORT_COLUMNS.latestPurchasePrice]: 80,
            [ITEMS_IMPORT_COLUMNS.isActive]: true,
            [ITEMS_IMPORT_COLUMNS.mainImageUrl]: '',
            [ITEMS_IMPORT_COLUMNS.galleryUrls]: '',
        };

        for (const field of customFieldDefinitions) {
            row[`${ITEMS_CUSTOM_FIELD_PREFIX}${field.id}`] = field.defaultValue ?? '';
        }

        return row;
    }

    private formatCustomFieldValue(value: unknown): string | number | boolean {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join('|');
        return value as string | number | boolean;
    }
}