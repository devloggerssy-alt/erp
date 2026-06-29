import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
    createCrudImportExportController,
    type CrudImportExportOpenApi,
} from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { UnitsExportService } from '../services/units-export.service';
import { UnitsImportService } from '../services/units-import.service';

const UNITS_IMPORT_EXPORT_OPENAPI = {
    export: {
        operation: {
            summary: 'Export units to Excel',
            description: 'Exports units matching the current list filters (max 10,000 rows).',
        },
    },
    template: {
        operation: {
            summary: 'Download units import template',
            description: 'Returns an Excel template with column headers, sample row, and instructions.',
        },
    },
    import: {
        operation: {
            summary: 'Import units from Excel',
            description: 'Upserts units by name. Use dryRun=true to validate without saving.',
        },
    },
} satisfies CrudImportExportOpenApi;

const UnitsImportExportBase = createCrudImportExportController({
    filterSchema: [
        { field: 'name', type: 'string' },
        { field: 'abbreviation', type: 'string' },
        { field: 'isActive', type: 'boolean' },
        { field: 'createdAt', type: 'date' },
    ],
    openApi: UNITS_IMPORT_EXPORT_OPENAPI,
});

@ApiTags('Catalog / Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsImportExportController extends UnitsImportExportBase {
    constructor(
        unitsExportService: UnitsExportService,
        unitsImportService: UnitsImportService,
    ) {
        super(unitsExportService, unitsImportService);
    }
}