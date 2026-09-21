import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
    BalanceDriftReportDto,
    CashboxDriftDto,
    StockBalanceDriftDto,
    UnbalancedJournalEntryDto,
    CashSubledgerDriftDto,
    PartySubledgerDriftDto,
    BankSubledgerDriftDto,
    BankAccountDriftDto,
    InventoryValuationDriftDto,
    MultiCurrencyLineDriftDto,
    MultiCurrencyDriftReason,
} from '../dto/balance-drift.dto';

/**
 * Phase 0.2 — compares denormalized balance caches against their ledger source
 * of truth. See docs/superpowers/specs/2026-08-20-erp-roadmap/drift-baselines.md
 */

/** Decimal(18,4) — compare at the precision the column actually stores. */
const TOLERANCE = 0.0001;

const NOT_CHECKED = [
    'StockBalance.averageCost — a running weighted average whose recomputation requires replaying every movement in order. Reconciliation validates total valuation against the GL instead.',
    'ChartOfAccount.currentBalance — no longer exists. Removed in the CoA refactor; account balances are computed from JournalLine on read, so the cache cannot drift.',
];

/** Check 6: GL rounds per document, the movement sum per line. */
const INVENTORY_TOLERANCE = 0.01;
/** Check 8: bound the report if a posting path is systemically wrong. */
const MAX_FX_FINDINGS = 200;
const CHECK_6_SKIPPED = 'Check 6 (Inventory GL vs stock valuation) — no default Inventory account in Financial Settings.';

function num(value: unknown): number {
    return Number(value ?? 0);
}

function drifted(a: number, b: number): boolean {
    return Math.abs(a - b) > TOLERANCE;
}

interface SubledgerRow {
    dimensionId: string;
    balance: string | null;
}

interface ProjectionDrift {
    id: string;
    code: string;
    cached: number;
    derived: number;
    difference: number;
}

/** Projection column vs subledger, keyed by dimension id. Missing subledger = 0. */
function diffProjection(
    rows: Array<{ id: string; code: string; balance: unknown }>,
    subledger: SubledgerRow[],
): ProjectionDrift[] {
    const derivedById = new Map(subledger.map((s) => [s.dimensionId, num(s.balance)]));
    const results: ProjectionDrift[] = [];
    for (const row of rows) {
        const cached = num(row.balance);
        const derived = derivedById.get(row.id) ?? 0;
        if (drifted(cached, derived)) {
            results.push({ id: row.id, code: row.code, cached, derived, difference: Number((cached - derived).toFixed(4)) });
        }
    }
    return results;
}

@Injectable()
export class BalanceDriftService {
    constructor(private readonly prisma: PrismaService) {}

    async getReport(tenantId: string): Promise<BalanceDriftReportDto> {
        const [
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            inventory,
            multiCurrencyLines,
        ] = await Promise.all([
            this.checkCashboxes(tenantId),
            this.checkStockBalances(tenantId),
            this.checkJournalEntryBalance(tenantId),
            this.checkCashSubledgers(tenantId),
            this.checkPartySubledgers(tenantId),
            this.checkBankSubledgers(tenantId),
            this.checkBankAccounts(tenantId),
            this.checkInventoryValuation(tenantId),
            this.checkMultiCurrencyLines(tenantId),
        ]);

        const sections = [
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            inventory.findings,
            multiCurrencyLines,
        ];

        return {
            generatedAt: new Date().toISOString(),
            clean: sections.every((section) => section.length === 0),
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            inventoryValuation: inventory.findings,
            multiCurrencyLines,
            notChecked: inventory.skipped ? [...NOT_CHECKED, CHECK_6_SKIPPED] : NOT_CHECKED,
        };
    }

    /**
     * Check #2 — `Cashbox.balance` (the cashbox's own currency) vs the cashbox
     * subledger: Σ over posted journal lines carrying this cashboxId of +|amount|
     * on the debit side (money in) and −|amount| on the credit side. ADR-1: the
     * ledger is the truth, the column is an operational projection.
     */
    private async checkCashboxes(tenantId: string): Promise<CashboxDriftDto[]> {
        const [boxes, subledger] = await Promise.all([
            this.prisma.cashbox.findMany({
                where: { tenantId },
                select: { id: true, code: true, balance: true },
            }),
            this.prisma.$queryRaw<SubledgerRow[]>`
                SELECT jl.cashbox_id AS "dimensionId",
                       SUM(CASE WHEN jl.debit > 0 THEN ABS(jl.amount) ELSE -ABS(jl.amount) END)::text AS "balance"
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                WHERE jl.tenant_id = ${tenantId}
                  AND je.status = 'POSTED'
                  AND jl.cashbox_id IS NOT NULL
                GROUP BY jl.cashbox_id`,
        ]);

        return diffProjection(boxes, subledger).map((d) => ({
            cashboxId: d.id,
            code: d.code,
            cachedBalance: d.cached,
            derivedBalance: d.derived,
            difference: d.difference,
        }));
    }

    /**
     * `StockBalance.quantity` vs `SUM(StockMovement.quantity)` per
     * (warehouse, item). Order-independent, so this one is exact.
     */
    private async checkStockBalances(tenantId: string): Promise<StockBalanceDriftDto[]> {
        const [balances, movements] = await Promise.all([
            this.prisma.stockBalance.findMany({
                where: { tenantId },
                select: { warehouseId: true, itemId: true, quantity: true },
            }),
            this.prisma.stockMovement.groupBy({
                by: ['warehouseId', 'itemId'],
                where: { tenantId },
                _sum: { quantity: true },
            }),
        ]);

        const key = (warehouseId: string, itemId: string) => `${warehouseId}::${itemId}`;
        const derived = new Map(
            movements.map((m) => [key(m.warehouseId, m.itemId), num(m._sum.quantity)]),
        );

        const results: StockBalanceDriftDto[] = [];
        for (const balance of balances) {
            const cached = num(balance.quantity);
            const derivedQuantity = derived.get(key(balance.warehouseId, balance.itemId)) ?? 0;
            if (drifted(cached, derivedQuantity)) {
                results.push({
                    warehouseId: balance.warehouseId,
                    itemId: balance.itemId,
                    cachedQuantity: cached,
                    derivedQuantity,
                    difference: Number((cached - derivedQuantity).toFixed(4)),
                });
            }
        }

        // A movement group with no StockBalance row at all is also drift.
        for (const movement of movements) {
            const exists = balances.some(
                (b) => b.warehouseId === movement.warehouseId && b.itemId === movement.itemId,
            );
            const derivedQuantity = num(movement._sum.quantity);
            if (!exists && drifted(0, derivedQuantity)) {
                results.push({
                    warehouseId: movement.warehouseId,
                    itemId: movement.itemId,
                    cachedQuantity: 0,
                    derivedQuantity,
                    difference: Number((-derivedQuantity).toFixed(4)),
                });
            }
        }

        return results;
    }

    /**
     * Every posted entry must balance. `JournalPostingService` enforces this on
     * write, so a hit here means data was written around the service — the most
     * serious finding this report can produce.
     */
    private async checkJournalEntryBalance(tenantId: string): Promise<UnbalancedJournalEntryDto[]> {
        const sums = await this.prisma.journalLine.groupBy({
            by: ['journalEntryId'],
            where: { tenantId, journalEntry: { status: 'POSTED' } },
            _sum: { debit: true, credit: true },
        });

        const offenders = sums.filter((s) => drifted(num(s._sum.debit), num(s._sum.credit)));
        if (offenders.length === 0) return [];

        const entries = await this.prisma.journalEntry.findMany({
            where: { id: { in: offenders.map((o) => o.journalEntryId) } },
            select: { id: true, number: true },
        });
        const numberById = new Map(entries.map((e) => [e.id, e.number]));

        return offenders.map((o) => {
            const totalDebit = num(o._sum.debit);
            const totalCredit = num(o._sum.credit);
            return {
                journalEntryId: o.journalEntryId,
                number: numberById.get(o.journalEntryId) ?? '(unknown)',
                totalDebit,
                totalCredit,
                difference: Number((totalDebit - totalCredit).toFixed(4)),
            };
        });
    }

    /**
     * Cash control GL (FinancialSetting.defaultCashAccountId) per currency vs the
     * aggregated cashbox subledger (every posted line carrying a cashboxId) per
     * currency — reconciliation stack check #1. Both sides must be identical; a
     * difference means a cash-tagged line never reached the Cash GL or vice versa.
     */
    private async checkCashSubledgers(tenantId: string): Promise<CashSubledgerDriftDto[]> {
        const settings = await this.prisma.financialSetting.findFirst({ where: { tenantId } });
        if (!settings?.defaultCashAccountId) return [];

        const [gl, sub] = await Promise.all([
            this.prisma.journalLine.groupBy({
                by: ['currencyId'],
                where: { tenantId, accountId: settings.defaultCashAccountId, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
            this.prisma.journalLine.groupBy({
                by: ['currencyId'],
                where: { tenantId, cashboxId: { not: null }, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
        ]);

        return this.diffPerCurrency(gl, sub).map(({ currencyId, glBalance, subledgerBalance }) => ({
            currencyId,
            glBalance,
            subledgerBalance,
            difference: Number((glBalance - subledgerBalance).toFixed(4)),
        }));
    }

    /**
     * AR / AP control accounts vs their party-attributed lines, per currency
     * (reconciliation stack checks #4/#5). A difference means a control-account
     * line lacks a partyId.
     */
    private async checkPartySubledgers(tenantId: string): Promise<PartySubledgerDriftDto[]> {
        const settings = await this.prisma.financialSetting.findFirst({ where: { tenantId } });
        const controls: Array<{ accountId: string; side: 'AR' | 'AP' }> = [];
        if (settings?.defaultReceivableAccountId) controls.push({ accountId: settings.defaultReceivableAccountId, side: 'AR' });
        if (settings?.defaultPayableAccountId) controls.push({ accountId: settings.defaultPayableAccountId, side: 'AP' });
        const results: PartySubledgerDriftDto[] = [];

        for (const { accountId, side } of controls) {
            const [gl, sub] = await Promise.all([
                this.prisma.journalLine.groupBy({
                    by: ['currencyId'],
                    where: { tenantId, accountId, journalEntry: { status: 'POSTED' } },
                    _sum: { debit: true, credit: true },
                }),
                this.prisma.journalLine.groupBy({
                    by: ['currencyId'],
                    where: { tenantId, accountId, partyId: { not: null }, journalEntry: { status: 'POSTED' } },
                    _sum: { debit: true, credit: true },
                }),
            ]);
            for (const { currencyId, glBalance, subledgerBalance } of this.diffPerCurrency(gl, sub)) {
                results.push({
                    controlAccountId: accountId,
                    side,
                    currencyId,
                    glBalance,
                    subledgerBalance,
                    difference: Number((glBalance - subledgerBalance).toFixed(4)),
                });
            }
        }

        return results;
    }

    /**
     * Bank control GL (defaultBankAccountId) per currency vs the bankAccountId
     * subledger per currency (reconciliation stack check #3). Stub-level today —
     * Phase 7 deepens this; no bank postings exist yet so both sides are 0.
     */
    private async checkBankSubledgers(tenantId: string): Promise<BankSubledgerDriftDto[]> {
        const settings = await this.prisma.financialSetting.findFirst({ where: { tenantId } });
        if (!settings?.defaultBankAccountId) return [];

        const [gl, sub] = await Promise.all([
            this.prisma.journalLine.groupBy({
                by: ['currencyId'],
                where: { tenantId, accountId: settings.defaultBankAccountId, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
            this.prisma.journalLine.groupBy({
                by: ['currencyId'],
                where: { tenantId, bankAccountId: { not: null }, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
        ]);

        return this.diffPerCurrency(gl, sub).map(({ currencyId, glBalance, subledgerBalance }) => ({
            currencyId,
            glBalance,
            subledgerBalance,
            difference: Number((glBalance - subledgerBalance).toFixed(4)),
        }));
    }

    /**
     * Check #3 (projection half) — `BankAccount.balance` (account currency) vs the
     * bankAccountId subledger in transaction currency. Same sign rule as check #2.
     */
    private async checkBankAccounts(tenantId: string): Promise<BankAccountDriftDto[]> {
        const [accounts, subledger] = await Promise.all([
            this.prisma.bankAccount.findMany({
                where: { tenantId },
                select: { id: true, code: true, balance: true },
            }),
            this.prisma.$queryRaw<SubledgerRow[]>`
                SELECT jl.bank_account_id AS "dimensionId",
                       SUM(CASE WHEN jl.debit > 0 THEN ABS(jl.amount) ELSE -ABS(jl.amount) END)::text AS "balance"
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                WHERE jl.tenant_id = ${tenantId}
                  AND je.status = 'POSTED'
                  AND jl.bank_account_id IS NOT NULL
                GROUP BY jl.bank_account_id`,
        ]);

        return diffProjection(accounts, subledger).map((d) => ({
            bankAccountId: d.id,
            code: d.code,
            cachedBalance: d.cached,
            derivedBalance: d.derived,
            difference: d.difference,
        }));
    }

    /**
     * Check #6 — Inventory control GL (base) vs Σ(quantity × unitCost) over every
     * stock movement (base: purchases convert at the invoice rate; sales, counts and
     * transfers use average cost). Skipped, and listed in notChecked, when the tenant
     * has no Inventory account — perpetual inventory is not configured.
     */
    private async checkInventoryValuation(
        tenantId: string,
    ): Promise<{ findings: InventoryValuationDriftDto[]; skipped: boolean }> {
        const settings = await this.prisma.financialSetting.findFirst({ where: { tenantId } });
        const inventoryAccountId = settings?.defaultInventoryAccountId;
        if (!inventoryAccountId) return { findings: [], skipped: true };

        const [gl, valuation] = await Promise.all([
            this.prisma.journalLine.aggregate({
                where: { tenantId, accountId: inventoryAccountId, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
            this.prisma.$queryRaw<Array<{ value: string | null }>>`
                SELECT SUM(sm.quantity * sm.unit_cost)::text AS "value"
                FROM stock_movements sm
                WHERE sm.tenant_id = ${tenantId}`,
        ]);

        const glBalance = Number((num(gl._sum.debit) - num(gl._sum.credit)).toFixed(4));
        const stockValuation = Number(num(valuation[0]?.value).toFixed(4));
        if (Math.abs(glBalance - stockValuation) <= INVENTORY_TOLERANCE) return { findings: [], skipped: false };

        return {
            findings: [
                {
                    inventoryAccountId,
                    glBalance,
                    stockValuation,
                    difference: Number((glBalance - stockValuation).toFixed(4)),
                },
            ],
            skipped: false,
        };
    }

    /**
     * Check #8 — every posted line satisfies (debit + credit) = ROUND(|amount| × rate, 4).
     * A line with amount 0 and a non-zero base was written by a path that never recorded
     * its transaction amount (MISSING_AMOUNT); anything else is RATE_MISMATCH.
     */
    private async checkMultiCurrencyLines(tenantId: string): Promise<MultiCurrencyLineDriftDto[]> {
        const rows = await this.prisma.$queryRaw<
            Array<{ journalLineId: string; journalEntryNumber: string; amount: string; exchangeRate: string; baseAmount: string }>
        >`
            SELECT jl.id AS "journalLineId",
                   je.number AS "journalEntryNumber",
                   jl.amount::text AS "amount",
                   jl.exchange_rate::text AS "exchangeRate",
                   (jl.debit + jl.credit)::text AS "baseAmount"
            FROM journal_lines jl
            JOIN journal_entries je ON je.id = jl.journal_entry_id
            WHERE jl.tenant_id = ${tenantId}
              AND je.status = 'POSTED'
              AND ABS((jl.debit + jl.credit) - ROUND(ABS(jl.amount) * jl.exchange_rate, 4)) > 0.0001
            ORDER BY je.number, jl.sort_order
            LIMIT ${MAX_FX_FINDINGS}`;

        return rows.map((row) => {
            const amount = num(row.amount);
            const exchangeRate = num(row.exchangeRate);
            const baseAmount = num(row.baseAmount);
            const expectedBaseAmount = Number((Math.abs(amount) * exchangeRate).toFixed(4));
            return {
                journalLineId: row.journalLineId,
                journalEntryNumber: row.journalEntryNumber,
                amount,
                exchangeRate,
                baseAmount,
                expectedBaseAmount,
                difference: Number((baseAmount - expectedBaseAmount).toFixed(4)),
                reason: amount === 0 ? MultiCurrencyDriftReason.MISSING_AMOUNT : MultiCurrencyDriftReason.RATE_MISMATCH,
            };
        });
    }

    /** Compares Σ(debit−credit) per currency between two groupBy result sets. */
    private diffPerCurrency(
        gl: Array<{ currencyId: string | null; _sum: { debit: unknown; credit: unknown } | null }>,
        sub: Array<{ currencyId: string | null; _sum: { debit: unknown; credit: unknown } | null }>,
    ): Array<{ currencyId: string | null; glBalance: number; subledgerBalance: number }> {
        const key = (currencyId: string | null) => currencyId ?? '__base__';
        const balance = (rows: typeof gl) =>
            new Map(rows.map((r) => [key(r.currencyId), num(r._sum?.debit) - num(r._sum?.credit)]));

        const glMap = balance(gl);
        const subMap = balance(sub);
        const currencyKeys = new Set([...glMap.keys(), ...subMap.keys()]);

        const results: Array<{ currencyId: string | null; glBalance: number; subledgerBalance: number }> = [];
        for (const k of currencyKeys) {
            const glBalance = glMap.get(k) ?? 0;
            const subledgerBalance = subMap.get(k) ?? 0;
            if (drifted(glBalance, subledgerBalance)) {
                results.push({ currencyId: k === '__base__' ? null : k, glBalance, subledgerBalance });
            }
        }
        return results;
    }
}
