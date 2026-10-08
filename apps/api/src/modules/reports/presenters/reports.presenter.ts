import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type {
    InvoiceReportItem,
    LocalizedString,
    PartyStatementResponse,
    StockBalanceReportItem,
} from '@devloggers/api-contracts';
import type { Prisma } from '@devloggers/db-prisma';

export type StockBalanceRow = {
    itemId: string;
    warehouseId: string;
    quantity: Prisma.Decimal;
    averageCost: Prisma.Decimal;
    updatedAt: Date;
    item: { code: string; name: string };
    warehouse: { code: string; name: Prisma.JsonValue };
};

export type InvoiceRow = {
    id: string;
    number: string;
    date: Date;
    total: Prisma.Decimal;
    partyId: string;
    party?: { name: string; code: string | null } | null;
};

export type PartyStatementInput = {
    party: { id: string; name: string; code: string | null } | null;
    invoices: InvoiceRow[];
    payments: { id: string; date: Date; amount: Prisma.Decimal }[];
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
};

@Injectable()
export class ReportsPresenter {
    constructor(private readonly locale: LocaleResolverService) {}

    toStockBalance(rows: StockBalanceRow[]): StockBalanceReportItem[] {
        return rows.map((row) => ({
            itemId: row.itemId,
            itemName: row.item.name,
            itemCode: row.item.code,
            warehouseId: row.warehouseId,
            warehouseName: this.locale.resolve(row.warehouse.name as unknown as LocalizedString),
            warehouseCode: row.warehouse.code,
            quantity: Number(row.quantity),
            averageCost: Number(row.averageCost),
            updatedAt: row.updatedAt.toISOString(),
        }));
    }

    toInvoiceSummary(invoices: InvoiceRow[]): InvoiceReportItem[] {
        return invoices.map((invoice) => this.toInvoice(invoice));
    }

    toPartyStatement(statement: PartyStatementInput): PartyStatementResponse {
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

    private toInvoice(invoice: InvoiceRow): InvoiceReportItem {
        return {
            id: invoice.id,
            number: invoice.number,
            date: invoice.date.toISOString(),
            total: Number(invoice.total),
            partyId: invoice.partyId,
            party: invoice.party ? { name: invoice.party.name, code: invoice.party.code } : null,
        };
    }
}
