import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType, StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../../inventory/inventory.service';
import { AccountingPostingFacade, type InvoicePostedIntent, type InvoiceCancelledIntent } from '../../accounting/posting';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
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
        if (!invoice.warehouseId) throw new BadRequestException('Purchase invoice must have a warehouse assigned');
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

        return this.prisma.$transaction(async (tx) => {
            if (invoice.invoiceType.affectsStock) {
                for (const line of stockLines) {
                    await this.inventoryService.postMovementTx(tx, {
                        tenantId,
                        warehouseId: invoice.warehouseId!,
                        itemId: line.itemId,
                        fiscalPeriodId: invoice.fiscalPeriodId,
                        movementType: StockMovementType.PURCHASE,
                        quantity: Number(line.quantity),
                        unitCost: (Number(line.total) - Number(line.taxAmount)) / Number(line.quantity) * exchangeRate,
                        referenceType: 'invoice',
                        referenceId: invoice.id,
                        userId,
                    });
                    await tx.item.update({ where: { id: line.itemId }, data: { latestPurchasePrice: line.unitPrice } });
                }
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
        if (!invoice.warehouseId) throw new BadRequestException('Sales invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines drive COGS (base-currency averageCost); services have no COGS leg.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];

        return this.prisma.$transaction(async (tx) => {
            let cogsTotal = 0;
            for (const line of stockLines) {
                const balance = await tx.stockBalance.findUnique({
                    where: { tenantId_warehouseId_itemId: { tenantId, warehouseId: invoice.warehouseId!, itemId: line.itemId } },
                });
                const currentQty = balance ? Number(balance.quantity) : 0;
                const requestedQty = Number(line.quantity);
                if (currentQty < requestedQty) {
                    throw new BadRequestException(
                        `Insufficient stock for item "${line.itemId}". Available: ${currentQty}, Requested: ${requestedQty}`,
                    );
                }
                const unitCost = balance ? Number(balance.averageCost) : Number(line.unitPrice);
                cogsTotal += requestedQty * unitCost;
                await this.inventoryService.postMovementTx(tx, {
                    tenantId,
                    warehouseId: invoice.warehouseId!,
                    itemId: line.itemId,
                    fiscalPeriodId: invoice.fiscalPeriodId,
                    movementType: StockMovementType.SALE,
                    quantity: -requestedQty,
                    unitCost,
                    referenceType: 'invoice',
                    referenceId: invoice.id,
                    userId,
                });
            }

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

        return this.prisma.$transaction(async (tx) => {
            // Reverse the original stock movements at their recorded cost (keeps averageCost exact).
            const originalMovements = await tx.stockMovement.findMany({
                where: { tenantId, referenceType: 'invoice', referenceId: invoice.id },
            });
            for (const mv of originalMovements) {
                await this.inventoryService.postMovementTx(tx, {
                    tenantId,
                    warehouseId: mv.warehouseId,
                    itemId: mv.itemId,
                    fiscalPeriodId: invoice.fiscalPeriodId,
                    movementType: StockMovementType.ADJUSTMENT,
                    quantity: -Number(mv.quantity),
                    unitCost: Number(mv.unitCost),
                    referenceType: 'invoice_cancellation',
                    referenceId: invoice.id,
                    notes: `Cancellation of invoice ${invoice.number}`,
                    userId,
                });
            }

            await this.postingFacade.reverse(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }
}
