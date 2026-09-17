import type { BalanceDriftReportDto } from './dto/balance-drift.dto';
import { ReconciliationCheckCode, type ReconciliationCheckResultDto } from './dto/reconciliation.dto';

const GROWTH_TOLERANCE = 0.0001;

function check(number: number | null, code: ReconciliationCheckCode, findingCount: number): ReconciliationCheckResultDto {
    return { number, code, passed: findingCount === 0, findingCount };
}

/** Maps the drift report onto the reconciliation stack (00-accounting-principles.md), in order. */
export function buildChecks(report: BalanceDriftReportDto): ReconciliationCheckResultDto[] {
    const ar = report.partySubledgers.filter((p) => p.side === 'AR').length;
    const ap = report.partySubledgers.filter((p) => p.side === 'AP').length;
    return [
        check(1, ReconciliationCheckCode.CASH_GL_VS_CASHBOX_SUBLEDGER, report.cashSubledgers.length),
        check(2, ReconciliationCheckCode.CASHBOX_SUBLEDGER_VS_PROJECTION, report.cashboxes.length),
        check(3, ReconciliationCheckCode.BANK_GL_VS_BANK_SUBLEDGER, report.bankSubledgers.length + report.bankAccounts.length),
        check(4, ReconciliationCheckCode.AR_CONTROL_VS_CUSTOMER_SUBLEDGER, ar),
        check(5, ReconciliationCheckCode.AP_CONTROL_VS_SUPPLIER_SUBLEDGER, ap),
        check(6, ReconciliationCheckCode.INVENTORY_GL_VS_STOCK_VALUATION, report.inventoryValuation.length),
        check(7, ReconciliationCheckCode.JOURNAL_ENTRIES_BALANCED, report.unbalancedEntries.length),
        check(8, ReconciliationCheckCode.MULTI_CURRENCY_BASE_CONSISTENT, report.multiCurrencyLines.length),
        check(null, ReconciliationCheckCode.STOCK_QUANTITY_PROJECTION, report.stockBalances.length),
    ];
}

const currencyKey = (currencyId: string | null) => currencyId ?? 'base';

/** Stable key per finding → |difference|. Keys identify "the same drift" across runs. */
export function fingerprintReport(report: BalanceDriftReportDto): Record<string, number> {
    const findings: Record<string, number> = {};
    const add = (key: string, difference: number) => {
        findings[key] = Math.abs(difference);
    };

    for (const f of report.cashSubledgers) add(`CASH_GL:${currencyKey(f.currencyId)}`, f.difference);
    for (const f of report.cashboxes) add(`CASHBOX:${f.cashboxId}`, f.difference);
    for (const f of report.bankSubledgers) add(`BANK_GL:${currencyKey(f.currencyId)}`, f.difference);
    for (const f of report.bankAccounts) add(`BANK_ACCOUNT:${f.bankAccountId}`, f.difference);
    for (const f of report.partySubledgers) add(`PARTY_${f.side}:${f.controlAccountId}:${currencyKey(f.currencyId)}`, f.difference);
    for (const f of report.inventoryValuation) add(`INVENTORY_GL:${f.inventoryAccountId}`, f.difference);
    for (const f of report.unbalancedEntries) add(`JE_UNBALANCED:${f.journalEntryId}`, f.difference);
    for (const f of report.multiCurrencyLines) add(`FX_LINE:${f.journalLineId}`, f.difference);
    for (const f of report.stockBalances) add(`STOCK_QTY:${f.warehouseId}:${f.itemId}`, f.difference);

    return findings;
}

/**
 * drift-baselines.md policy: pre-existing drift is not a regression, an increase is.
 * First run (no previous) establishes the baseline and reports nothing new.
 */
export function diffNewFindings(previous: Record<string, number> | null, current: Record<string, number>): string[] {
    if (previous === null) return [];
    return Object.entries(current)
        .filter(([key, magnitude]) => {
            const before = previous[key];
            return before === undefined || magnitude - before > GROWTH_TOLERANCE;
        })
        .map(([key]) => key)
        .sort();
}

/** Reads ReconciliationRun.findings (Json) back defensively. */
export function parseFindings(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, number> = {};
    for (const [key, magnitude] of Object.entries(value)) {
        if (typeof magnitude === 'number') out[key] = magnitude;
    }
    return out;
}
