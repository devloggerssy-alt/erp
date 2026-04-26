import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
    ) {}

    /**
     * Post a purchase invoice:
     * 1. Validate the invoice is in DRAFT status
     * 2. If affectsStock → increase stock for each line
     * 3. Update latestPurchasePrice on items
     * 4. Mark invoice as POSTED
     */
    async postPurchaseInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: true,
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        if (invoice.status !== 'DRAFT') {
            throw new BadRequestException('Only draft invoices can be posted');
        }

        if (invoice.invoiceType.direction !== 'PURCHASE') {
            throw new BadRequestException('This is not a purchase invoice');
        }

        if (!invoice.warehouseId) {
            throw new BadRequestException('Purchase invoice must have a warehouse assigned');
        }

        if (invoice.lines.length === 0) {
            throw new BadRequestException('Invoice must have at least one line');
        }

        // Post stock movements for each line (if type affects stock)
        if (invoice.invoiceType.affectsStock) {
            for (const line of invoice.lines) {
                await this.inventoryService.postMovement({
                    tenantId,
                    warehouseId: invoice.warehouseId,
                    itemId: line.itemId,
                    fiscalPeriodId: invoice.fiscalPeriodId,
                    movementType: StockMovementType.PURCHASE,
                    quantity: Number(line.quantity), // positive = inflow
                    unitCost: Number(line.unitPrice),
                    referenceType: 'invoice',
                    referenceId: invoice.id,
                    userId,
                });

                // Update latestPurchasePrice on the item
                await this.prisma.item.update({
                    where: { id: line.itemId },
                    data: { latestPurchasePrice: line.unitPrice },
                });
            }
        }

        // Mark as posted
        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'POSTED',
                postedAt: new Date(),
                postedBy: userId,
            },
            include: {
                invoiceType: true,
                lines: true,
            },
        });
    }

    /**
     * Post a sales invoice:
     * 1. Validate the invoice is in DRAFT status
     * 2. If affectsStock → validate stock availability, then decrease stock
     * 3. Mark invoice as POSTED
     */
    async postSalesInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: true,
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        if (invoice.status !== 'DRAFT') {
            throw new BadRequestException('Only draft invoices can be posted');
        }

        if (invoice.invoiceType.direction !== 'SALE') {
            throw new BadRequestException('This is not a sales invoice');
        }

        if (!invoice.warehouseId) {
            throw new BadRequestException('Sales invoice must have a warehouse assigned');
        }

        if (invoice.lines.length === 0) {
            throw new BadRequestException('Invoice must have at least one line');
        }

        // Validate stock availability and post movements
        if (invoice.invoiceType.affectsStock) {
            for (const line of invoice.lines) {
                // Check stock availability
                const balance = await this.prisma.stockBalance.findUnique({
                    where: {
                        tenantId_warehouseId_itemId: {
                            tenantId,
                            warehouseId: invoice.warehouseId,
                            itemId: line.itemId,
                        },
                    },
                });

                const currentQty = balance ? Number(balance.quantity) : 0;
                const requestedQty = Number(line.quantity);

                if (currentQty < requestedQty) {
                    const item = await this.prisma.item.findUnique({ where: { id: line.itemId } });
                    throw new BadRequestException(
                        `Insufficient stock for item "${item?.name || line.itemId}". ` +
                        `Available: ${currentQty}, Requested: ${requestedQty}`,
                    );
                }

                // Post negative movement (outflow)
                await this.inventoryService.postMovement({
                    tenantId,
                    warehouseId: invoice.warehouseId,
                    itemId: line.itemId,
                    fiscalPeriodId: invoice.fiscalPeriodId,
                    movementType: StockMovementType.SALE,
                    quantity: -requestedQty, // negative = outflow
                    unitCost: balance ? Number(balance.averageCost) : Number(line.unitPrice),
                    referenceType: 'invoice',
                    referenceId: invoice.id,
                    userId,
                });
            }
        }

        // Mark as posted
        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'POSTED',
                postedAt: new Date(),
                postedBy: userId,
            },
            include: {
                invoiceType: true,
                lines: true,
            },
        });
    }

    /**
     * Cancel a posted invoice:
     * 1. Reverse stock movements (create opposite movements)
     * 2. Mark invoice as CANCELLED
     * No delete after posting — only cancel.
     */
    async cancelInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: true,
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        if (invoice.status !== 'POSTED') {
            throw new BadRequestException('Only posted invoices can be cancelled');
        }

        // Reverse stock movements if type affects stock
        if (invoice.invoiceType.affectsStock && invoice.warehouseId) {
            for (const line of invoice.lines) {
                const isPurchase = invoice.invoiceType.direction === 'PURCHASE';
                // Reverse: purchase was +qty, so cancel is -qty. Sales was -qty, so cancel is +qty.
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

        // Mark as cancelled
        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledBy: userId,
            },
            include: {
                invoiceType: true,
                lines: true,
            },
        });
    }
}
