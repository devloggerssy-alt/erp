import {
    BadRequestException,
    Injectable,
    StreamableFile,
} from '@nestjs/common';
import {
    buildInstructionsSheet,
    buildWorkbookBuffer,
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
import { buildPrismaWhere, type FindManyOptions } from '@devloggers/backend-core';
import { ApiQueryOptionsDto } from '@/common/api/api-query-options.dto';
import { CustomFieldsRepository } from '@/modules/custom-fields/repositories/custom-fields.repository';
import { CustomFieldValuesService } from '@/modules/custom-fields/services/custom-field-values.service';
import { ItemsRepository } from '../repositories/items.repository';
import { ItemPresenter } from '../presenters/item.presenter';

type ItemExportRow = Record<string, string | number | boolean>;

@Injectable()
export class ItemsExportService {
    constructor(
        private readonly itemsRepository: ItemsRepository,
        private readonly itemPresenter: ItemPresenter,
        private readonly customFieldsRepository: CustomFieldsRepository,
        private readonly customFieldValuesService: CustomFieldValuesService,
        private readonly prisma: PrismaService,
    ) {}

    async exportToExcel(
        tenantId: string,
        query: ApiQueryOptionsDto,
        filterSchema: Parameters<typeof buildPrismaWhere>[1],
    ): Promise<StreamableFile> {
        const where = buildPrismaWhere(query, filterSchema);
        const options: FindManyOptions = {
            where,
            take: ITEMS_EXPORT_MAX_ROWS,
            skip: 0,
            orderBy: { code: 'asc' },
        };

        const [result, customFieldDefinitions] = await Promise.all([
            this.itemsRepository.findManyWithRelations(tenantId, options),
            this.customFieldsRepository.findByModule(tenantId, customFieldModules.items),
        ]);

        const customFieldsByItem = await this.customFieldValuesService.getForEntities(
            tenantId,
            customFieldModules.items,
            result.data.map((item) => item.id),
        );

        const columns = this.buildColumns(customFieldDefinitions);
        const rows = result.data.map((entity) => {
            const response = this.itemPresenter.toResponse(entity);
            const customFields = customFieldsByItem[entity.id] ?? {};
            return this.toExportRow(response, entity, customFields, customFieldDefinitions);
        });

        const sheets: WorkbookSheet[] = [
            {
                name: 'Items',
                columns,
                rows,
            },
            buildInstructionsSheet([...ITEMS_INSTRUCTIONS]),
        ];

        const buffer = await buildWorkbookBuffer(sheets);
        const filename = `items-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

        return new StreamableFile(buffer, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            disposition: `attachment; filename="${filename}"`,
        });
    }

    async buildTemplate(tenantId: string): Promise<StreamableFile> {
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

        const columns = this.buildColumns(customFieldDefinitions);
        const exampleRow =
            categories[0] && units[0]
                ? this.buildExampleRow(
                      customFieldDefinitions,
                      categories[0].name,
                      units[0].name,
                      brands[0]?.name ?? '',
                  )
                : null;

        const sheets: WorkbookSheet[] = [
            {
                name: 'Items',
                columns,
                rows: exampleRow ? [exampleRow] : [],
            },
            this.buildLookupsSheet(categories, units, brands),
            buildInstructionsSheet([...ITEMS_INSTRUCTIONS]),
        ];

        const buffer = await buildWorkbookBuffer(sheets);

        return new StreamableFile(buffer, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            disposition: 'attachment; filename="items-import-template.xlsx"',
        });
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

    private toExportRow(
        response: ReturnType<ItemPresenter['toResponse']>,
        entity: { category: { name: string }; baseUnit: { name: string }; brand?: { name: string } | null },
        customFields: CustomFieldValuesMap,
        customFieldDefinitions: CustomField[],
    ): ItemExportRow {
        const row: ItemExportRow = {
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
    ): ItemExportRow {
        const row: ItemExportRow = {
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
