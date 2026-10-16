import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import type { Party, Payment, Prisma } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import type {
    DashboardCashboxDto,
    InvoiceReportItemDto,
    PartyStatementResponseDto,
    StockBalanceReportItemDto,
} from '../dto';
import type {
    DashboardCashboxRow,
    InvoiceSummaryRow,
    PartyStatementInvoiceRow,
    StockBalanceRow,
} from '../report-queries';

type InvoiceRow = InvoiceSummaryRow | PartyStatementInvoiceRow;

export interface PartyStatementInput {
    party: Party | null;
    invoices: PartyStatementInvoiceRow[];
    payments: Payment[];
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
}

function readLocalized(value: Prisma.JsonValue): LocalizedString {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ar: '' };
    const ar = 'ar' in value && typeof value.ar === 'string' ? value.ar : '';
    const en = 'en' in value && typeof value.en === 'string' ? value.en : undefined;
    return en ? { ar, en } : { ar };
}

@Injectable()
export class ReportsPresenter {
    constructor(private readonly locale: LocaleResolverService) {}

    toStockBalance(rows: StockBalanceRow[]): StockBalanceReportItemDto[] {
        return rows.map((row) => ({
            itemId: row.itemId,
            itemName: row.item.name,
            itemCode: row.item.code,
            warehouseId: row.warehouseId,
            warehouseName: this.locale.resolve(toLocalizedString(row.warehouse.name)),
            warehouseCode: row.warehouse.code,
            quantity: Number(row.quantity),
            averageCost: Number(row.averageCost),
            updatedAt: row.updatedAt.toISOString(),
        }));
    }

    toInvoiceSummary(invoices: InvoiceSummaryRow[]): InvoiceReportItemDto[] {
        return invoices.map((invoice) => this.toInvoice(invoice));
    }

    toDashboardCashboxes(rows: DashboardCashboxRow[]): DashboardCashboxDto[] {
        return rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: readLocalized(row.name),
            balance: row.balance.toString(),
            currency: {
                code: row.currency.code,
                symbol: row.currency.symbol == null ? null : readLocalized(row.currency.symbol),
            },
        }));
    }

    toPartyStatement(statement: PartyStatementInput): PartyStatementResponseDto {
        return {
            party: statement.party
                ? { id: statement.party.id, name: statement.party.name, code: statement.party.code }
                : null,
            invoices: statement.invoices.map((invoice) => this.toInvoice(invoice)),
            payments: statement.payments.map((payment) => ({
                id: payment.id,
                date: payment.date.toISOString(),
                amount: Number(payment.amount),
            })),
            totalInvoiced: statement.totalInvoiced,
            totalPaid: statement.totalPaid,
            balance: statement.balance,
        };
    }

    private toInvoice(invoice: InvoiceRow): InvoiceReportItemDto {
        // Statement invoices are loaded without the party: they belong to the statement's party.
        const party = 'party' in invoice ? invoice.party : undefined;
        return {
            id: invoice.id,
            number: invoice.number,
            date: invoice.date.toISOString(),
            total: Number(invoice.total),
            partyId: invoice.partyId,
            party: party ? { name: party.name, code: party.code } : null,
        };
    }
}
