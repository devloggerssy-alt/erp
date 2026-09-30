import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString } from 'class-validator';

/** Exact phrase a user must type to confirm a full tenant database restore. */
export const IMPORT_DATABASE_CONFIRMATION = 'IMPORT DATABASE';

// ── Request DTO ─────────────────────────────────────────────────────────────

export class ImportDatabaseDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Gzip-compressed backup file (.json.gz) produced by the export endpoint.',
    })
    file: unknown;

    @ApiProperty({
        type: 'string',
        example: IMPORT_DATABASE_CONFIRMATION,
        description: `Confirmation phrase. Must be exactly "${IMPORT_DATABASE_CONFIRMATION}".`,
    })
    @IsString()
    @Equals(IMPORT_DATABASE_CONFIRMATION, { message: 'Confirmation phrase does not match' })
    confirmation: string = '';
}

// ── Response DTO ────────────────────────────────────────────────────────────

export class DatabaseBackupResultDto {
    @ApiProperty({ type: 'number', example: 48, description: 'Number of cataloged models processed' })
    modelsProcessed: number = 0;

    @ApiProperty({
        type: 'object',
        additionalProperties: { type: 'number' },
        example: { currency: 3, chartOfAccount: 42, invoice: 128 },
        description: 'Rows loaded per model (by delegate key)',
    })
    countsByModel: Record<string, number> = {};
}
