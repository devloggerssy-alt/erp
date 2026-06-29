import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
    createCrudImportExportController,
    type CrudImportExportOpenApi,
} from '@devloggers/backend-core';
import { itemCategoryResource } from '@devloggers/api-contracts';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { ItemsExportService } from '../services/items-export.service';
import { ItemsImportService } from '../services/items-import.service';

const ITEMS_IMPORT_EXPORT_OPENAPI = {
    export: {
        operation: {
            summary: 'Export items to Excel',
            description: 'Exports items matching the current list filters (max 10,000 rows). Includes custom field columns.',
        },
    },
    template: {
        operation: {
            summary: 'Download items import template',
            description: 'Returns an Excel template with column headers, sample row, and instructions.',
        },
    },
    import: {
        operation: {
            summary: 'Import items from Excel',
            description: 'Upserts items by code. Use dryRun=true to validate without saving.',
        },
    },
} satisfies CrudImportExportOpenApi;

const ItemsImportExportBase = createCrudImportExportController({
    filterSchema: [
        { field: 'categoryId', type: 'id', foreignResourceKey: itemCategoryResource.key },
        { field: 'name', type: 'string' },
        { field: 'code', type: 'string' },
        { field: 'defaultSellingPrice', type: 'number' },
        { field: 'isActive', type: 'boolean' },
        { field: 'createdAt', type: 'date' },
    ],
    openApi: ITEMS_IMPORT_EXPORT_OPENAPI,
});

@ApiTags('Catalog / Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemsImportExportController extends ItemsImportExportBase {
    constructor(
        itemsExportService: ItemsExportService,
        itemsImportService: ItemsImportService,
    ) {
        super(itemsExportService, itemsImportService);
    }
}