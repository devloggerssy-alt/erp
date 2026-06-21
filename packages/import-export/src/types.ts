export type ImportRowError = {
    row: number;
    field?: string;
    message: string;
};

export type ImportResult = {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: ImportRowError[];
    dryRun: boolean;
};

export type SheetColumn = {
    key: string;
    header: string;
    width?: number;
};

export type WorkbookSheet = {
    name: string;
    columns: SheetColumn[];
    rows: Record<string, unknown>[];
};
