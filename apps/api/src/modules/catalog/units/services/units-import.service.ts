import { Injectable } from '@nestjs/common';
import { type ImportResult, UNITS_IMPORT_COLUMNS } from '@devloggers/api-contracts';
import type { Unit } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
    CrudImportServiceBase,
    normalizeLookupKey,
    parseBooleanCell,
    parseStringCell,
    type ParsedImportRow,
} from '@devloggers/backend-core';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from '../dto';

type UnitsImportContext = {
    existingByName: Map<string, string>;
};

@Injectable()
export class UnitsImportService extends CrudImportServiceBase<
    Unit,
    unknown,
    CreateUnitDto,
    UpdateUnitDto
> {
    protected readonly resourceKey = 'units';

    constructor(
        unitsService: UnitsService,
        private readonly prisma: PrismaService,
    ) {
        super(unitsService);
    }

    override async buildImportContext(tenantId: string): Promise<UnitsImportContext> {
        const units = await this.prisma.unit.findMany({
            where: { tenantId },
            select: { id: true, name: true },
        });
        return {
            existingByName: new Map(
                units.map((unit) => [normalizeLookupKey(unit.name), unit.id]),
            ),
        };
    }

    parseRow(
        rawRow: Record<string, unknown>,
        rowNumber: number,
        context: unknown,
        result: ImportResult,
    ): ParsedImportRow<CreateUnitDto, UpdateUnitDto> | null {
        const { existingByName } = context as UnitsImportContext;

        const name = parseStringCell(rawRow[UNITS_IMPORT_COLUMNS.name]);
        const abbreviation = parseStringCell(rawRow[UNITS_IMPORT_COLUMNS.abbreviation]);

        if (!name) {
            result.errors.push({ row: rowNumber, field: UNITS_IMPORT_COLUMNS.name, message: 'Name is required' });
            result.skipped += 1;
            return null;
        }
        if (!abbreviation) {
            result.errors.push({ row: rowNumber, field: UNITS_IMPORT_COLUMNS.abbreviation, message: 'Abbreviation is required' });
            result.skipped += 1;
            return null;
        }

        const isActive = parseBooleanCell(rawRow[UNITS_IMPORT_COLUMNS.isActive]) ?? true;

        const createDto: CreateUnitDto = { name, abbreviation };
        const updateDto: UpdateUnitDto = { name, abbreviation, isActive };

        const existingId = existingByName.get(normalizeLookupKey(name));

        return {
            rowNumber,
            createDto,
            updateDto,
            existingId,
        };
    }
}