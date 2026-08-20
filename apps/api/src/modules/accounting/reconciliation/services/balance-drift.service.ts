import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
    BalanceDriftReportDto,
    CashboxDriftDto,
    StockBalanceDriftDto,
    UnbalancedJournalEntryDto,
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
        const [cashboxes, stockBalances, unbalancedEntries] = await Promise.all([
            this.checkCashboxes(tenantId),
            this.checkStockBalances(tenantId),
            this.checkJournalEntryBalance(tenantId),
        ]);

        return {
            generatedAt: new Date().toISOString(),
            clean:
                cashboxes.length === 0 &&
                stockBalances.length === 0 &&
                unbalancedEntries.length === 0,
            cashboxes,
            stockBalances,
            unbalancedEntries,
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
        const [boxes, payments, expenses] = await Promise.all([
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
        ]);

        const derived = new Map<string, number>();
        for (const row of payments) {
            const signed = row.type === 'RECEIPT' ? num(row._sum.amount) : -num(row._sum.amount);
            derived.set(row.cashboxId, (derived.get(row.cashboxId) ?? 0) + signed);
        }
        for (const row of expenses) {
            derived.set(row.cashboxId, (derived.get(row.cashboxId) ?? 0) - num(row._sum.totalAmount));
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
}
