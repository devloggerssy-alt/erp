import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../../inventory/inventory.service';
import { FinancialSettingsService } from '../../accounting/financial-settings/services/financial-settings.service';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { buildInvoiceJournalLines } from './invoice-journal';
import { createPostingJournalEntry } from '../../accounting/accounts/utils/create-posting-journal-entry';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly financialSettingsService: FinancialSettingsService,
        private readonly docSeqService: DocumentSequencesService,
    ) {}

    async postPurchaseInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                party: { select: { payableAccountId: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        if (invoice.invoiceType.direction !== 'PURCHASE') throw new BadRequestException('This is not a purchase invoice');
        if (!invoice.warehouseId) throw new BadRequestException('Purchase invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const settings = await this.financialSettingsService.getOrThrow(tenantId);

        const payableAccountId = invoice.party?.payableAccountId ?? settings.defaultPayableAccountId;
        if (!payableAccountId) throw new BadRequestException('No Accounts Payable account configured. Set a default in Financial Settings or on the party.');
        if (!settings.defaultPurchaseAccountId) throw new BadRequestException('No default Purchase account configured in Financial Settings.');

        // Stock movements (outside the GL transaction — InventoryService has its own)
        if (invoice.invoiceType.affectsStock) {
            for (const line of invoice.lines) {
                if (line.item.itemType !== 'service') {
                    await this.inventoryService.postMovement({
                        tenantId,
                        warehouseId: invoice.warehouseId,
                        itemId: line.itemId,
                        fiscalPeriodId: invoice.fiscalPeriodId,
                        movementType: StockMovementType.PURCHASE,
                        quantity: Number(line.quantity),
                        unitCost: Number(line.unitPrice),
                        referenceType: 'invoice',
                        referenceId: invoice.id,
                        userId,
                    });
                    await this.prisma.item.update({
                        where: { id: line.itemId },
                        data: { latestPurchasePrice: line.unitPrice },
                    });
                }
            }
        }

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);
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
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            await createPostingJournalEntry(tx, {
                tenantId,
                number: jeNumber,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                referenceType: 'invoice',
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
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        if (invoice.invoiceType.direction !== 'SALE') throw new BadRequestException('This is not a sales invoice');
        if (!invoice.warehouseId) throw new BadRequestException('Sales invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const settings = await this.financialSettingsService.getOrThrow(tenantId);

        const receivableAccountId = invoice.party?.receivableAccountId ?? settings.defaultReceivableAccountId;
        if (!receivableAccountId) throw new BadRequestException('No Accounts Receivable account configured. Set a default in Financial Settings or on the party.');
        if (!settings.defaultSalesAccountId) throw new BadRequestException('No default Sales account configured in Financial Settings.');

        // Stock movements
        if (invoice.invoiceType.affectsStock) {
            for (const line of invoice.lines) {
                if (line.item.itemType !== 'service') {
                    const balance = await this.prisma.stockBalance.findUnique({
                        where: { tenantId_warehouseId_itemId: { tenantId, warehouseId: invoice.warehouseId!, itemId: line.itemId } },
                    });
                    const currentQty = balance ? Number(balance.quantity) : 0;
                    const requestedQty = Number(line.quantity);
                    if (currentQty < requestedQty) {
                        const item = await this.prisma.item.findUnique({ where: { id: line.itemId } });
                        throw new BadRequestException(
                            `Insufficient stock for item "${item?.name || line.itemId}". Available: ${currentQty}, Requested: ${requestedQty}`,
                        );
                    }
                    await this.inventoryService.postMovement({
                        tenantId,
                        warehouseId: invoice.warehouseId!,
                        itemId: line.itemId,
                        fiscalPeriodId: invoice.fiscalPeriodId,
                        movementType: StockMovementType.SALE,
                        quantity: -requestedQty,
                        unitCost: balance ? Number(balance.averageCost) : Number(line.unitPrice),
                        referenceType: 'invoice',
                        referenceId: invoice.id,
                        userId,
                    });
                }
            }
        }

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);
        const journalLines = buildInvoiceJournalLines({
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
            await createPostingJournalEntry(tx, {
                tenantId,
                number: jeNumber,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                referenceType: 'invoice',
                referenceId: invoice.id,
                description: `Sales invoice ${invoice.number}`,
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

    async cancelInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                party: { select: { receivableAccountId: true, payableAccountId: true } },
                paymentAllocations: true,
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'POSTED') throw new BadRequestException('Only posted invoices can be cancelled');
        if (invoice.paymentAllocations.length > 0) {
            throw new BadRequestException(
                'Cannot cancel an invoice with payments allocated to it. Remove the payment allocations first.',
            );
        }

        const settings = await this.financialSettingsService.getOrThrow(tenantId);
        const isPurchase = invoice.invoiceType.direction === 'PURCHASE';

        const receivableAccountId = invoice.party?.receivableAccountId ?? settings.defaultReceivableAccountId ?? '';
        const payableAccountId = invoice.party?.payableAccountId ?? settings.defaultPayableAccountId ?? '';

        // Reverse stock movements
        if (invoice.invoiceType.affectsStock && invoice.warehouseId) {
            for (const line of invoice.lines) {
                if (line.item.itemType !== 'service') {
                    const reverseQty = isPurchase ? -Number(line.quantity) : Number(line.quantity);
                    await this.inventoryService.postMovement({
                        tenantId,
                        warehouseId: invoice.warehouseId,
                        itemId: line.itemId,
                        fiscalPeriodId: invoice.fiscalPeriodId,
                        movementType: StockMovementType.ADJUSTMENT,
                        quantity: reverseQty,
                        unitCost: Number(line.unitPrice),
                        referenceType: 'invoice_cancellation',
                        referenceId: invoice.id,
                        notes: `Cancellation of invoice ${invoice.number}`,
                        userId,
                    });
                }
            }
        }

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);
        const reversalLines = buildInvoiceJournalLines(
            {
                direction: invoice.invoiceType.direction as 'PURCHASE' | 'SALE',
                netAmount,
                taxAmount: Number(invoice.taxAmount),
                total: Number(invoice.total),
                exchangeRate,
                receivableAccountId,
                payableAccountId,
                salesAccountId: settings.defaultSalesAccountId ?? '',
                purchaseAccountId: settings.defaultPurchaseAccountId ?? '',
                taxAccountId: settings.defaultTaxAccountId ?? null,
                partyId: invoice.partyId,
            },
            { reverse: true },
        );

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            await createPostingJournalEntry(tx, {
                tenantId,
                number: jeNumber,
                date: new Date(),
                fiscalPeriodId: invoice.fiscalPeriodId,
                referenceType: 'invoice_cancellation',
                referenceId: invoice.id,
                description: `Reversal of invoice ${invoice.number}`,
                exchangeRate,
                userId,
                lines: reversalLines,
            });

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }
}
