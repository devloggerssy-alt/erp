/** Stable column keys for units Excel import/export (row 1 headers). */
export const UNITS_IMPORT_COLUMNS = {
    name: 'name',
    abbreviation: 'abbreviation',
    isActive: 'is_active',
} as const;

export const UNITS_BASE_COLUMN_KEYS = Object.values(UNITS_IMPORT_COLUMNS);

export const UNITS_EXPORT_MAX_ROWS = 10_000;

export const UNITS_INSTRUCTIONS = [
    { column: UNITS_IMPORT_COLUMNS.name, description: 'Required. Unit display name. Upserted by name on import — must be unique within the tenant.' },
    { column: UNITS_IMPORT_COLUMNS.abbreviation, description: 'Required. Short abbreviation used on documents (e.g. kg, pcs).' },
    { column: UNITS_IMPORT_COLUMNS.isActive, description: 'Optional. true/false, yes/no, or 1/0. Defaults to true on create; only applied on update.' },
] as const;