import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocalizationSettingsDto {
    @ApiProperty({ example: 'UTC', description: 'IANA timezone identifier' })
    timezone: string = 'UTC';

    @ApiProperty({ enum: ['en', 'ar', 'tr'], example: 'en' })
    locale: string = 'en';

    @ApiProperty({ enum: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], example: 'YYYY-MM-DD' })
    dateFormat: string = 'YYYY-MM-DD';

    @ApiProperty({ enum: ['1,234.56', '1.234,56'], example: '1,234.56' })
    numberFormat: string = '1,234.56';

    @ApiProperty({ example: 1, description: '0 = Sunday … 6 = Saturday' })
    firstDayOfWeek: number = 1;
}

export class FinancialSettingsDto {
    @ApiProperty({ example: 0, description: 'Default tax rate percentage (0–100)' })
    defaultTaxRate: number = 0;

    @ApiProperty({ example: 2, description: 'Decimal places used when rounding amounts (0–6)' })
    roundingPrecision: number = 2;

    @ApiProperty({ example: 1, description: 'Month the fiscal year starts (1 = January)' })
    fiscalYearStartMonth: number = 1;
}

export class DocumentsSettingsDto {
    @ApiProperty({ example: '', description: 'Default notes appended to invoices' })
    invoiceDefaultNotes: string = '';

    @ApiProperty({ example: '', description: 'Default payment terms appended to invoices' })
    invoiceDefaultTerms: string = '';

    @ApiProperty({ example: '', description: 'Footer text printed on all documents' })
    documentFooter: string = '';

    @ApiProperty({ example: true, description: 'Whether to print the tenant logo on documents' })
    showLogoOnDocuments: boolean = true;
}

export class SettingsResponseDto {
    @ApiProperty({ type: LocalizationSettingsDto })
    localization: LocalizationSettingsDto = new LocalizationSettingsDto();

    @ApiProperty({ type: FinancialSettingsDto })
    financial: FinancialSettingsDto = new FinancialSettingsDto();

    @ApiProperty({ type: DocumentsSettingsDto })
    documents: DocumentsSettingsDto = new DocumentsSettingsDto();
}

// ── Form defaults ─────────────────────────────────────────────────────────────

export class FormDefaultFiscalPeriodDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a700-000000000001' })
    id: string = '';
    @ApiProperty({ type: 'string', example: '2026' })
    name: string = '';
}

export class FormDefaultCurrencyDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a700-000000000002' })
    id: string = '';
    @ApiProperty({ type: 'string', example: 'USD' })
    code: string = '';
    @ApiProperty({ type: 'string', example: 'US Dollar' })
    name: string = '';
}

export class FormDefaultCashboxDto {
    @ApiProperty({ type: 'string', example: '00000000-0000-4000-a700-000000000003' })
    id: string = '';
    @ApiProperty({ type: 'string', example: 'MAIN' })
    code: string = '';
    @ApiProperty({ type: 'string', example: 'Main Cashbox' })
    name: string = '';
}

export class FormDefaultsResponseDto {
    @ApiPropertyOptional({ type: () => FormDefaultFiscalPeriodDto, nullable: true, description: 'Current open fiscal period covering today, or null' })
    fiscalPeriod: FormDefaultFiscalPeriodDto | null = null;

    @ApiPropertyOptional({ type: () => FormDefaultCurrencyDto, nullable: true, description: 'Tenant base currency, or null if not configured' })
    currency: FormDefaultCurrencyDto | null = null;

    @ApiPropertyOptional({ type: () => FormDefaultCashboxDto, nullable: true, description: 'First active cashbox in the base currency, or null' })
    cashbox: FormDefaultCashboxDto | null = null;
}

export class UpdateSettingsDto {
    // ── Localization ──
    @ApiPropertyOptional({ type: 'string', example: 'Europe/Istanbul' })
    timezone?: string;

    @ApiPropertyOptional({ type: 'string', enum: ['en', 'ar', 'tr'] })
    locale?: string;

    @ApiPropertyOptional({ type: 'string', enum: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'] })
    dateFormat?: string;

    @ApiPropertyOptional({ type: 'string', enum: ['1,234.56', '1.234,56'] })
    numberFormat?: string;

    @ApiPropertyOptional({ type: 'number', example: 1 })
    firstDayOfWeek?: number;

    // ── Financial ──
    @ApiPropertyOptional({ type: 'number', example: 15 })
    defaultTaxRate?: number;

    @ApiPropertyOptional({ type: 'number', example: 2 })
    roundingPrecision?: number;

    @ApiPropertyOptional({ type: 'number', example: 1 })
    fiscalYearStartMonth?: number;

    // ── Documents ──
    @ApiPropertyOptional({ type: 'string', example: 'Thank you for your business.' })
    invoiceDefaultNotes?: string;

    @ApiPropertyOptional({ type: 'string', example: 'Net 30' })
    invoiceDefaultTerms?: string;

    @ApiPropertyOptional({ type: 'string', example: 'Company Reg. No. 12345' })
    documentFooter?: string;

    @ApiPropertyOptional({ type: 'boolean', example: true })
    showLogoOnDocuments?: boolean;
}
