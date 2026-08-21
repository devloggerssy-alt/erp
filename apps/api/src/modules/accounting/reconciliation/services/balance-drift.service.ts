import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import {
    BalanceDriftReportDto,
    CashboxDriftDto,
    StockBalanceDriftDto,
    UnbalancedJournalEntryDto,
    CashSubledgerDriftDto,
    PartySubledgerDriftDto,
    BankSubledgerDriftDto,
    BankAccountDriftDto,
} from '../dto/balance-drift.dto';

/**
 * Phase 0.2 — compares denormalized balance caches against their ledger source
 * of truth. See docs/superpowers/specs/2026-08-20-erp-roadmap/drift-baselines.md
 */

/** Decimal(18,4) — compare at the precision the column actually stores. */
const TOLERANCE = 0.0001;

const NOT_CHECKED = [
    'StockBalance.averageCost — a running weighted average whose recomputation requires replaying every movement in order. Deferred to Phase 7.',
    'ChartOfAccount.currentBalance — no longer exists. Removed in the CoA refactor; account balances are computed from JournalLine on read, so the cache cannot drift.',
];

function num(value: unknown): number {
    return Number(value ?? 0);
}

function drifted(a: number, b: number): boolean {
    return Math.abs(a - b) > TOLERANCE;
}

@Injectable()
export class BalanceDriftService {
    constructor(private readonly prisma: PrismaService) {}

    async getReport(tenantId: string): Promise<BalanceDriftReportDto> {
        const [cashboxes, stockBalances, unbalancedEntries, cashSubledgers, partySubledgers, bankSubledgers, bankAccounts] =
            await Promise.all([
                this.checkCashboxes(tenantId),
                this.checkStockBalances(tenantId),
                this.checkJournalEntryBalance(tenantId),
                this.checkCashSubledgers(tenantId),
                this.checkPartySubledgers(tenantId),
                this.checkBankSubledgers(tenantId),
                this.checkBankAccounts(tenantId),
            ]);

        return {
            generatedAt: new Date().toISOString(),
            clean:
                cashboxes.length === 0 &&
                stockBalances.length === 0 &&
                unbalancedEntries.length === 0 &&
                cashSubledgers.length === 0 &&
                partySubledgers.length === 0 &&
                bankSubledgers.length === 0 &&
                bankAccounts.length === 0,
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            notChecked: NOT_CHECKED,
        };
    }

    /**
     * `Cashbox.balance` is incremented/decremented by payments and expenses as
     * they post and cancel. Rebuild it from those documents:
     *
     *   balance = Σ posted RECEIPT − Σ posted PAYMENT/ADJUSTMENT − Σ posted expenses
     *
     * Cancelled documents are excluded on both sides, which mirrors what the
     * post/cancel pair does to the cache.
     */
    private async checkCashboxes(tenantId: string): Promise<CashboxDriftDto[]> {
        const [boxes, payments, expenses, openings] = await Promise.all([
            this.prisma.cashbox.findMany({
                where: { tenantId },
                select: { id: true, code: true, balance: true },
            }),
            this.prisma.payment.groupBy({
                by: ['cashboxId', 'type'],
                where: { tenantId, status: 'POSTED' },
                _sum: { amount: true },
            }),
            this.prisma.expense.groupBy({
                by: ['cashboxId'],
                where: { tenantId, status: 'POSTED' },
                _sum: { totalAmount: true },
            }),
            this.prisma.journalLine.groupBy({
                by: ['cashboxId'],
                where: { tenantId, journalEntry: { status: 'POSTED', referenceType: ReferenceType.OPENING_BALANCE } },
                _sum: { debit: true, credit: true },
            }),
        ]);

        const derived = new Map<string, number>();
        for (const row of payments) {
            const signed = row.type === 'RECEIPT' ? num(row._sum.amount) : -num(row._sum.amount);
            derived.set(row.cashboxId, (derived.get(row.cashboxId) ?? 0) + signed);
        }
        for (const row of expenses) {
            derived.set(row.cashboxId, (derived.get(row.cashboxId) ?? 0) - num(row._sum.totalAmount));
        }
        // Opening cash JE lines carry cashboxId and debit the Cash control account —
        // money in, so they increase the derived balance (ADR-4 projection).
        for (const row of openings) {
            if (!row.cashboxId) continue;
            const signed = num(row._sum.debit) - num(row._sum.credit);
            derived.set(row.cashboxId, (derived.get(row.cashboxId) ?? 0) + signed);
        }

        const results: CashboxDriftDto[] = [];
        for (const box of boxes) {
            const cached = num(box.balance);
            const derivedBalance = derived.get(box.id) ?? 0;
            if (drifted(cached, derivedBalance)) {
                results.push({
                    cashboxId: box.id,
                    code: box.code,
                    cachedBalance: cached,
                    derivedBalance,
                    difference: Number((cached - derivedBalance).toFixed(4)),
                });
            }
        }
        return results;
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
        const controls = [settings?.defaultReceivableAccountId, settings?.defaultPayableAccountId].filter(
            (v): v is string => !!v,
        );
        const results: PartySubledgerDriftDto[] = [];

        for (const accountId of controls) {
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
     * BankAccount.balance projection vs its posted journal lines — the bank
     * analogue of checkCashboxes. Operational projection, reconciled to the ledger.
     */
    private async checkBankAccounts(tenantId: string): Promise<BankAccountDriftDto[]> {
        const [accounts, lines] = await Promise.all([
            this.prisma.bankAccount.findMany({
                where: { tenantId },
                select: { id: true, code: true, balance: true },
            }),
            this.prisma.journalLine.groupBy({
                by: ['bankAccountId'],
                where: { tenantId, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
        ]);

        const derived = new Map(
            lines
                .filter((l) => l.bankAccountId)
                .map((l) => [l.bankAccountId as string, num(l._sum.debit) - num(l._sum.credit)]),
        );

        const results: BankAccountDriftDto[] = [];
        for (const account of accounts) {
            const cached = num(account.balance);
            const derivedBalance = derived.get(account.id) ?? 0;
            if (drifted(cached, derivedBalance)) {
                results.push({
                    bankAccountId: account.id,
                    code: account.code,
                    cachedBalance: cached,
                    derivedBalance,
                    difference: Number((cached - derivedBalance).toFixed(4)),
                });
            }
        }
        return results;
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
