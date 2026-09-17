import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import {
    InventoryMovementFacade,
    type PurchaseReceiptIntent,
    type SaleIssueIntent,
    type InvoiceReversalIntent,
} from '../../inventory';
import { AccountingPostingFacade, type InvoicePostedIntent, type InvoiceCancelledIntent } from '../../accounting/posting';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly movements: InventoryMovementFacade,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    async postPurchaseInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);
        if (invoice.invoiceType.direction !== 'PURCHASE') throw new BadRequestException('This is not a purchase invoice');
        const warehouseId = invoice.warehouseId;
        if (!warehouseId) throw new BadRequestException('Purchase invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines capitalized to Inventory (invoice-currency net); services stay as Purchase expense.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];
        const inventoryAmount = stockLines.reduce(
            (s, l) => s + (Number(l.total) - Number(l.taxAmount)),
            0,
        );

        const intent: InvoicePostedIntent = {
            kind: 'INVOICE_POSTED',
            tenantId,
            userId,
            date: invoice.date,
            fiscalPeriodId: invoice.fiscalPeriodId,
            fiscalPeriodStatus: invoice.fiscalPeriod?.status,
            exchangeRate,
            referenceId: invoice.id,
            description: `Purchase invoice ${invoice.number}`,
            direction: 'PURCHASE',
            partyId: invoice.partyId,
            currencyId: invoice.currencyId,
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            inventoryAmount,
        };

        const receipt: PurchaseReceiptIntent = {
            kind: 'PURCHASE_RECEIPT',
            tenantId,
            userId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            warehouseId,
            invoiceId: invoice.id,
            // Base-currency net unit cost: tax-exclusive line total / qty × locked rate.
            lines: stockLines.map((line) => ({
                itemId: line.itemId,
                quantity: Number(line.quantity),
                unitCost: (Number(line.total) - Number(line.taxAmount)) / Number(line.quantity) * exchangeRate,
            })),
        };

        return this.prisma.$transaction(async (tx) => {
            await this.movements.apply(tx, receipt);
            for (const line of stockLines) {
                await tx.item.update({ where: { id: line.itemId }, data: { latestPurchasePrice: line.unitPrice } });
            }

            await this.postingFacade.record(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }

    async postSalesInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);
        if (invoice.invoiceType.direction !== 'SALE') throw new BadRequestException('This is not a sales invoice');
        const warehouseId = invoice.warehouseId;
        if (!warehouseId) throw new BadRequestException('Sales invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines drive COGS (base-currency averageCost); services have no COGS leg.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];

        const issue: SaleIssueIntent = {
            kind: 'SALE_ISSUE',
            tenantId,
            userId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            warehouseId,
            invoiceId: invoice.id,
            lines: stockLines.map((line) => ({
                itemId: line.itemId,
                quantity: Number(line.quantity),
                fallbackUnitCost: Number(line.unitPrice),
            })),
        };

        return this.prisma.$transaction(async (tx) => {
            const { valueDelta } = await this.movements.apply(tx, issue);
            // An issue's valueDelta is Σ(−qty × averageCost) ≤ 0; COGS is its magnitude.
            const cogsTotal = Math.abs(valueDelta);

            const intent: InvoicePostedIntent = {
                kind: 'INVOICE_POSTED',
                tenantId,
                userId,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                fiscalPeriodStatus: invoice.fiscalPeriod?.status,
                exchangeRate,
                referenceId: invoice.id,
                description: `Sales invoice ${invoice.number}`,
                direction: 'SALE',
                partyId: invoice.partyId,
                currencyId: invoice.currencyId,
                netAmount,
                taxAmount: Number(invoice.taxAmount),
                total: Number(invoice.total),
                cogsTotal,
            };
            await this.postingFacade.record(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }

    async cancelInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                paymentAllocations: true,
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'POSTED') throw new BadRequestException('Only posted invoices can be cancelled');
        if (invoice.paymentAllocations.length > 0) {
            throw new BadRequestException(
                'Cannot cancel an invoice with payments allocated to it. Remove the payment allocations first.',
            );
        }

        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);

        const original = await this.prisma.journalEntry.findFirst({
            where: { tenantId, referenceType: ReferenceType.INVOICE, referenceId: invoice.id, status: 'POSTED' },
            orderBy: { createdAt: 'desc' },
        });
        if (!original) throw new BadRequestException('Original journal entry not found for this invoice.');

        const exchangeRate = Number(invoice.exchangeRate);
        const intent: InvoiceCancelledIntent = {
            kind: 'INVOICE_CANCELLED',
            tenantId,
            userId,
            date: invoice.date,
            fiscalPeriodId: invoice.fiscalPeriodId,
            fiscalPeriodStatus: invoice.fiscalPeriod?.status,
            exchangeRate,
            referenceId: invoice.id,
            description: `Reversal of invoice ${invoice.number}`,
            originalEntryId: original.id,
        };

        const reversal: InvoiceReversalIntent = {
            kind: 'INVOICE_REVERSAL',
            tenantId,
            userId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
        };

        return this.prisma.$transaction(async (tx) => {
            await this.movements.apply(tx, reversal);

            await this.postingFacade.reverse(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }
}
