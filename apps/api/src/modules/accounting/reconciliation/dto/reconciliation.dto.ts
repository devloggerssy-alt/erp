import { ApiProperty } from '@nestjs/swagger';
import { BalanceDriftReportDto } from './balance-drift.dto';

/** Reconciliation stack — 00-accounting-principles.md. Response DTOs: initializers, not `!`. */
export enum ReconciliationCheckCode {
    CASH_GL_VS_CASHBOX_SUBLEDGER = 'CASH_GL_VS_CASHBOX_SUBLEDGER',
    CASHBOX_SUBLEDGER_VS_PROJECTION = 'CASHBOX_SUBLEDGER_VS_PROJECTION',
    BANK_GL_VS_BANK_SUBLEDGER = 'BANK_GL_VS_BANK_SUBLEDGER',
    AR_CONTROL_VS_CUSTOMER_SUBLEDGER = 'AR_CONTROL_VS_CUSTOMER_SUBLEDGER',
    AP_CONTROL_VS_SUPPLIER_SUBLEDGER = 'AP_CONTROL_VS_SUPPLIER_SUBLEDGER',
    INVENTORY_GL_VS_STOCK_VALUATION = 'INVENTORY_GL_VS_STOCK_VALUATION',
    JOURNAL_ENTRIES_BALANCED = 'JOURNAL_ENTRIES_BALANCED',
    MULTI_CURRENCY_BASE_CONSISTENT = 'MULTI_CURRENCY_BASE_CONSISTENT',
    STOCK_QUANTITY_PROJECTION = 'STOCK_QUANTITY_PROJECTION',
}

export class ReconciliationCheckResultDto {
    @ApiProperty({ type: 'number', nullable: true, example: 1, description: 'Position in the 8-check stack; null = supplementary check' })
    number: number | null = null;

    @ApiProperty({ enum: ReconciliationCheckCode, enumName: 'ReconciliationCheckCode' })
    code: ReconciliationCheckCode = ReconciliationCheckCode.CASH_GL_VS_CASHBOX_SUBLEDGER;

    @ApiProperty({ type: 'boolean', example: true })
    passed: boolean = true;

    @ApiProperty({ type: 'number', example: 0 })
    findingCount: number = 0;
}

export class ReconciliationResultDto {
    @ApiProperty({ type: 'string', example: '2026-09-17T03:00:00.000Z' })
    generatedAt: string = '';

    @ApiProperty({ type: 'boolean', example: true, description: 'True when every check passed' })
    passed: boolean = true;

    @ApiProperty({ type: () => ReconciliationCheckResultDto, isArray: true })
    checks: ReconciliationCheckResultDto[] = [];

    @ApiProperty({ type: () => BalanceDriftReportDto, description: 'Full findings behind the check summary' })
    report: BalanceDriftReportDto = new BalanceDriftReportDto();
}
