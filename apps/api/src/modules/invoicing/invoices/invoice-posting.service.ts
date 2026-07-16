import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType, StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../../inventory/inventory.service';
import { FinancialSettingsService } from '../../accounting/financial-settings/services/financial-settings.service';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { JournalPostingService } from '../../accounting/accounts/services/journal-posting.service';
import { buildInvoiceJournalLines } from './invoice-journal';
import { buildCogsJournalLines } from '../../accounting/accounts/utils/inventory-journal';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly financialSettingsService: FinancialSettingsService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly journalPosting: JournalPostingService,
    ) {}

    async postPurchaseInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                party: { select: { payableAccountId: true } },
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);
        if (invoice.invoiceType.direction !== 'PURCHASE') throw new BadRequestException('This is not a purchase invoice');
        if (!invoice.warehouseId) throw new BadRequestException('Purchase invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const settings = await this.financialSettingsService.getOrThrow(tenantId);

        const payableAccountId = invoice.party?.payableAccountId ?? settings.defaultPayableAccountId;
        if (!payableAccountId) throw new BadRequestException('No Accounts Payable account configured. Set a default in Financial Settings or on the party.');
        if (!settings.defaultPurchaseAccountId) throw new BadRequestException('No default Purchase account configured in Financial Settings.');

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
        if (inventoryAmount > 0 && !settings.defaultInventoryAccountId) {
            throw new BadRequestException('No default Inventory account configured in Financial Settings.');
        }

        const journalLines = buildInvoiceJournalLines({
            direction: 'PURCHASE',
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            exchangeRate,
            receivableAccountId: settings.defaultReceivableAccountId ?? '',
            payableAccountId,
            salesAccountId: settings.defaultSalesAccountId ?? '',
            purchaseAccountId: settings.defaultPurchaseAccountId,
            taxAccountId: settings.defaultTaxAccountId ?? null,
            partyId: invoice.partyId,
            inventoryAmount,
            inventoryAccountId: settings.defaultInventoryAccountId ?? undefined,
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            if (invoice.invoiceType.affectsStock) {
                for (const line of stockLines) {
                    await this.inventoryService.postMovementTx(tx as any, {
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

            await this.journalPosting.post(tx, {
                tenantId,
                number: jeNumber,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                fiscalPeriodStatus: invoice.fiscalPeriod?.status,
                referenceType: ReferenceType.INVOICE,
                referenceId: invoice.id,
                description: `Purchase invoice ${invoice.number}`,
                exchangeRate,
                userId,
                lines: journalLines,
            });

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
                party: { select: { receivableAccountId: true } },
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);
        if (invoice.invoiceType.direction !== 'SALE') throw new BadRequestException('This is not a sales invoice');
        if (!invoice.warehouseId) throw new BadRequestException('Sales invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const settings = await this.financialSettingsService.getOrThrow(tenantId);

        const receivableAccountId = invoice.party?.receivableAccountId ?? settings.defaultReceivableAccountId;
        if (!receivableAccountId) throw new BadRequestException('No Accounts Receivable account configured. Set a default in Financial Settings or on the party.');
        if (!settings.defaultSalesAccountId) throw new BadRequestException('No default Sales account configured in Financial Settings.');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines drive COGS (base-currency averageCost); services have no COGS leg.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];
        if (stockLines.length > 0 && (!settings.defaultCogsAccountId || !settings.defaultInventoryAccountId)) {
            throw new BadRequestException('No default COGS / Inventory account configured in Financial Settings.');
        }

        const revenueLines = buildInvoiceJournalLines({
            direction: 'SALE',
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            exchangeRate,
            receivableAccountId,
            payableAccountId: settings.defaultPayableAccountId ?? '',
            salesAccountId: settings.defaultSalesAccountId,
            purchaseAccountId: settings.defaultPurchaseAccountId ?? '',
            taxAccountId: settings.defaultTaxAccountId ?? null,
            partyId: invoice.partyId,
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

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
                await this.inventoryService.postMovementTx(tx as any, {
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

            const cogsLines = cogsTotal > 0
                ? buildCogsJournalLines({
                    cogsAccountId: settings.defaultCogsAccountId!,
                    inventoryAccountId: settings.defaultInventoryAccountId!,
                    amount: cogsTotal,
                }).map((l, i) => ({ ...l, sortOrder: revenueLines.length + i }))
                : [];

            await this.journalPosting.post(tx, {
                tenantId,
                number: jeNumber,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                fiscalPeriodStatus: invoice.fiscalPeriod?.status,
                referenceType: ReferenceType.INVOICE,
                referenceId: invoice.id,
                description: `Sales invoice ${invoice.number}`,
                exchangeRate,
                userId,
                lines: [...revenueLines, ...cogsLines],
            });

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
                party: { select: { receivableAccountId: true, payableAccountId: true } },
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
            include: { lines: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!original) throw new BadRequestException('Original journal entry not found for this invoice.');

        const exchangeRate = Number(invoice.exchangeRate);
        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            // Reverse the original stock movements at their recorded cost (keeps averageCost exact).
            const originalMovements = await tx.stockMovement.findMany({
                where: { tenantId, referenceType: 'invoice', referenceId: invoice.id },
            });
            for (const mv of originalMovements) {
                await this.inventoryService.postMovementTx(tx as any, {
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

            await this.journalPosting.reverse(tx, {
                tenantId,
                number: jeNumber,
                originalEntryId: original.id,
                referenceType: ReferenceType.INVOICE_CANCELLATION,
                referenceId: invoice.id,
                description: `Reversal of invoice ${invoice.number}`,
                exchangeRate,
                userId,
                reversalDate: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                fiscalPeriodStatus: invoice.fiscalPeriod?.status,
            });

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }
}
