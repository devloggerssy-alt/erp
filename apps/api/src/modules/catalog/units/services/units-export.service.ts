import { Injectable } from '@nestjs/common';
import type { SheetColumn } from '@devloggers/import-export';
import {
    UNITS_IMPORT_COLUMNS,
    UNITS_EXPORT_MAX_ROWS,
    UNITS_INSTRUCTIONS,
} from '@devloggers/api-contracts';
import type { Unit } from '@devloggers/db-prisma';
import {
    CrudExportServiceBase,
    type ExportRow,
    type FindManyOptions,
} from '@devloggers/backend-core';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitPresenter } from '../presenters/unit.presenter';

@Injectable()
export class UnitsExportService extends CrudExportServiceBase<Unit> {
    protected readonly resourceKey = 'units';

    constructor(
        private readonly unitsRepository: UnitsRepository,
        private readonly unitPresenter: UnitPresenter,
    ) {
        super();
    }

    override getExportMaxRows(): number {
        return UNITS_EXPORT_MAX_ROWS;
    }

    override getExportOrderBy(): Record<string, 'asc' | 'desc'> {
        return { name: 'asc' };
    }

    override async fetchExportRows(
        tenantId: string,
        options: FindManyOptions,
    ): Promise<Unit[]> {
        const result = await this.unitsRepository.findMany(tenantId, options);
        return result.data;
    }

    override getColumns(): Promise<SheetColumn[]> {
        return Promise.resolve([
            { key: UNITS_IMPORT_COLUMNS.name, header: UNITS_IMPORT_COLUMNS.name, width: 28 },
            { key: UNITS_IMPORT_COLUMNS.abbreviation, header: UNITS_IMPORT_COLUMNS.abbreviation, width: 18 },
            { key: UNITS_IMPORT_COLUMNS.isActive, header: UNITS_IMPORT_COLUMNS.isActive, width: 12 },
        ]);
    }

    override toExportRow(entity: Unit): ExportRow {
        const response = this.unitPresenter.toResponse(entity);
        return {
            [UNITS_IMPORT_COLUMNS.name]: response.name,
            [UNITS_IMPORT_COLUMNS.abbreviation]: response.abbreviation,
            [UNITS_IMPORT_COLUMNS.isActive]: response.isActive,
        };
    }

    getInstructions() {
        return [...UNITS_INSTRUCTIONS];
    }

    override buildTemplateExampleRow(): Promise<ExportRow | null> {
        return Promise.resolve({
            [UNITS_IMPORT_COLUMNS.name]: 'Kilogram',
            [UNITS_IMPORT_COLUMNS.abbreviation]: 'kg',
            [UNITS_IMPORT_COLUMNS.isActive]: true,
        });
    }
}