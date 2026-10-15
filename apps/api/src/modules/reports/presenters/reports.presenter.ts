import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import type { Prisma } from '@devloggers/db-prisma';
import type {
    DashboardCashboxDto,
    InvoiceReportItemDto,
    PartyStatementResponseDto,
    StockBalanceReportItemDto,
} from '../dto';

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

export type DashboardCashboxRow = {
    id: string;
    code: string;
    name: Prisma.JsonValue;
    balance: { toString(): string };
    currency: { code: string; symbol: Prisma.JsonValue | null };
};

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
            warehouseName: this.locale.resolve(row.warehouse.name as unknown as LocalizedString),
            warehouseCode: row.warehouse.code,
            quantity: Number(row.quantity),
            averageCost: Number(row.averageCost),
            updatedAt: row.updatedAt.toISOString(),
        }));
    }

    toInvoiceSummary(invoices: InvoiceRow[]): InvoiceReportItemDto[] {
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
