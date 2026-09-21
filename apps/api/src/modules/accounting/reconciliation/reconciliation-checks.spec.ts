import { BalanceDriftReportDto, MultiCurrencyDriftReason } from './dto/balance-drift.dto';
import { ReconciliationCheckCode } from './dto/reconciliation.dto';
import { buildChecks, diffNewFindings, fingerprintReport, parseFindings } from './reconciliation-checks';

function report(patch: Partial<BalanceDriftReportDto> = {}): BalanceDriftReportDto {
    return { ...new BalanceDriftReportDto(), generatedAt: '2026-09-17T03:00:00.000Z', ...patch };
}

describe('buildChecks', () => {
    it('lists the 8 stack checks in order plus the supplementary stock-quantity check, all passing on a clean report', () => {
        const checks = buildChecks(report());
        expect(checks.map((c) => [c.number, c.code, c.passed, c.findingCount])).toEqual([
            [1, ReconciliationCheckCode.CASH_GL_VS_CASHBOX_SUBLEDGER, true, 0],
            [2, ReconciliationCheckCode.CASHBOX_SUBLEDGER_VS_PROJECTION, true, 0],
            [3, ReconciliationCheckCode.BANK_GL_VS_BANK_SUBLEDGER, true, 0],
            [4, ReconciliationCheckCode.AR_CONTROL_VS_CUSTOMER_SUBLEDGER, true, 0],
            [5, ReconciliationCheckCode.AP_CONTROL_VS_SUPPLIER_SUBLEDGER, true, 0],
            [6, ReconciliationCheckCode.INVENTORY_GL_VS_STOCK_VALUATION, true, 0],
            [7, ReconciliationCheckCode.JOURNAL_ENTRIES_BALANCED, true, 0],
            [8, ReconciliationCheckCode.MULTI_CURRENCY_BASE_CONSISTENT, true, 0],
            [null, ReconciliationCheckCode.STOCK_QUANTITY_PROJECTION, true, 0],
        ]);
    });

    it('splits party findings into AR (4) and AP (5), and counts bank GL + projection under 3', () => {
        const checks = buildChecks(
            report({
                partySubledgers: [
                    { controlAccountId: 'ar', side: 'AR', currencyId: 'USD', glBalance: 1, subledgerBalance: 0, difference: 1 },
                    { controlAccountId: 'ap', side: 'AP', currencyId: null, glBalance: 2, subledgerBalance: 0, difference: 2 },
                    { controlAccountId: 'ap', side: 'AP', currencyId: 'USD', glBalance: 3, subledgerBalance: 0, difference: 3 },
                ],
                bankSubledgers: [{ currencyId: null, glBalance: 1, subledgerBalance: 0, difference: 1 }],
                bankAccounts: [{ bankAccountId: 'ba1', code: 'B', cachedBalance: 1, derivedBalance: 0, difference: 1 }],
            }),
        );
        const byNumber = new Map(checks.map((c) => [c.number, c]));
        expect(byNumber.get(3)).toMatchObject({ passed: false, findingCount: 2 });
        expect(byNumber.get(4)).toMatchObject({ passed: false, findingCount: 1 });
        expect(byNumber.get(5)).toMatchObject({ passed: false, findingCount: 2 });
        expect(byNumber.get(1)?.passed).toBe(true);
    });
});

describe('fingerprintReport', () => {
    it('produces one stable key per finding with its absolute difference', () => {
        expect(
            fingerprintReport(
                report({
                    cashSubledgers: [{ currencyId: null, glBalance: 5, subledgerBalance: 7, difference: -2 }],
                    cashboxes: [{ cashboxId: 'cb1', code: 'C', cachedBalance: 1, derivedBalance: 0, difference: 1 }],
                    partySubledgers: [{ controlAccountId: 'ar', side: 'AR', currencyId: 'USD', glBalance: 1, subledgerBalance: 0, difference: 1 }],
                    inventoryValuation: [{ inventoryAccountId: 'inv', glBalance: 10, stockValuation: 4, difference: 6 }],
                    unbalancedEntries: [{ journalEntryId: 'je1', number: 'JE-1', totalDebit: 1, totalCredit: 0.5, difference: 0.5 }],
                    multiCurrencyLines: [
                        {
                            journalLineId: 'jl1',
                            journalEntryNumber: 'JE-2',
                            amount: 0,
                            exchangeRate: 1,
                            baseAmount: 3,
                            expectedBaseAmount: 0,
                            difference: 3,
                            reason: MultiCurrencyDriftReason.MISSING_AMOUNT,
                        },
                    ],
                    stockBalances: [{ warehouseId: 'w1', itemId: 'i1', cachedQuantity: 1, derivedQuantity: 3, difference: -2 }],
                }),
            ),
        ).toEqual({
            'CASH_GL:base': 2,
            'CASHBOX:cb1': 1,
            'PARTY_AR:ar:USD': 1,
            'INVENTORY_GL:inv': 6,
            'JE_UNBALANCED:je1': 0.5,
            'FX_LINE:jl1': 3,
            'STOCK_QTY:w1:i1': 2,
        });
    });
});

describe('diffNewFindings', () => {
    it('treats the first run as the baseline — nothing is "new"', () => {
        expect(diffNewFindings(null, { 'CASHBOX:cb1': 5 })).toEqual([]);
    });

    it('reports keys that appeared since the previous run', () => {
        expect(diffNewFindings({ 'CASHBOX:cb1': 5 }, { 'CASHBOX:cb1': 5, 'FX_LINE:jl9': 1 })).toEqual(['FX_LINE:jl9']);
    });

    it('reports existing findings whose magnitude grew, not ones that shrank or held', () => {
        expect(
            diffNewFindings(
                { 'CASHBOX:cb1': 5, 'CASHBOX:cb2': 5, 'CASHBOX:cb3': 5 },
                { 'CASHBOX:cb1': 5.00005, 'CASHBOX:cb2': 7, 'CASHBOX:cb3': 1 },
            ),
        ).toEqual(['CASHBOX:cb2']);
    });

    it('returns keys sorted for deterministic storage and alerts', () => {
        expect(diffNewFindings({}, { 'Z:1': 1, 'A:1': 1 })).toEqual(['A:1', 'Z:1']);
    });
});

describe('parseFindings', () => {
    it('keeps numeric entries and rejects anything else', () => {
        expect(parseFindings({ a: 1, b: 'x', c: null })).toEqual({ a: 1 });
        expect(parseFindings(null)).toEqual({});
        expect(parseFindings(['a'])).toEqual({});
    });
});
