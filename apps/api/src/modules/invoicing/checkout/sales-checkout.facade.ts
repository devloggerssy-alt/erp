import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import type { PaymentRecordedIntent } from '../../accounting/posting';
import { InvoicePostingService } from '../invoices/invoice-posting.service';
import { PaymentsService } from '../payments/payments.service';
import { computeInvoiceTotals } from '../invoices/invoice-totals';
import type { InvoiceLineDto } from '../invoices/dto';
import type { SalesCheckoutIntent, SalesCheckoutResult } from './sales-checkout.types';

@Injectable()
export class SalesCheckoutFacade {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeq: DocumentSequencesService,
        private readonly invoicePosting: InvoicePostingService,
        private readonly payments: PaymentsService,
    ) {}

    async checkout(intent: SalesCheckoutIntent): Promise<SalesCheckoutResult> {
        const { tenantId, clientRequestId } = intent;

        const existing = await this.prisma.invoice.findUnique({
            where: { tenantId_clientRequestId: { tenantId, clientRequestId } },
            include: { paymentAllocations: { include: { payment: true } } },
        });
        if (existing) {
            const allocation = existing.paymentAllocations[0];
            if (!allocation) {
                throw new BadRequestException(
                    'A checkout with this clientRequestId already exists but has no payment attached; contact support.',
                );
            }
            return {
                invoiceId: existing.id,
                invoiceNumber: existing.number,
                paymentId: allocation.payment.id,
                paymentNumber: allocation.payment.number,
                total: Number(existing.total),
                date: existing.date,
                replayed: true,
            };
        }

        const invoiceType = await this.prisma.invoiceType.findFirst({
            where: { id: intent.invoiceTypeId, tenantId },
        });
        if (!invoiceType) throw new NotFoundException('Invoice type not found');
        if (invoiceType.direction !== 'SALE') {
            throw new BadRequestException('POS checkout requires a SALE invoice type');
        }

        const currency = await this.prisma.currency.findFirst({ where: { tenantId, isBase: true } });
        if (!currency) throw new BadRequestException('No base currency configured for this tenant');

        const now = new Date();
        const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
            where: { tenantId, status: 'OPEN', startDate: { lte: now }, endDate: { gte: now } },
        });
        if (!fiscalPeriod) throw new BadRequestException("No open fiscal period covers today's date");

        const lines: InvoiceLineDto[] = intent.lines.map((line) => ({
            itemId: line.itemId,
            unitId: line.unitId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
        }));
        const totals = computeInvoiceTotals(tenantId, lines);

        if (intent.minimumTender !== undefined && intent.minimumTender < totals.total) {
            throw new BadRequestException(
                `Tendered amount (${intent.minimumTender}) is less than the total (${totals.total})`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const invoiceNumber = await this.docSeq.getNextNumberInTx(tx, tenantId, 'SALES_INVOICE');

            const invoice = await tx.invoice.create({
                data: {
                    tenantId,
                    invoiceTypeId: intent.invoiceTypeId,
                    number: invoiceNumber,
                    date: now,
                    partyId: intent.partyId,
                    warehouseId: intent.warehouseId,
                    fiscalPeriodId: fiscalPeriod.id,
                    currencyId: currency.id,
                    exchangeRate: 1,
                    subtotal: totals.subtotal,
                    discountAmount: totals.discountAmount,
                    taxAmount: totals.taxAmount,
                    total: totals.total,
                    notes: intent.notes,
                    createdBy: intent.userId,
                    clientRequestId,
                    lines: { create: totals.lines },
                },
                include: {
                    invoiceType: true,
                    lines: { include: { item: { select: { itemType: true } } } },
                    fiscalPeriod: { select: { status: true } },
                },
            });

            const postedInvoice = await this.invoicePosting.postSalesInvoiceInTx(tx, tenantId, invoice, intent.userId);

            const paymentNumber = await this.docSeq.getNextNumberInTx(tx, tenantId, 'RECEIPT');
            const payment = await tx.payment.create({
                data: {
                    tenantId,
                    number: paymentNumber,
                    type: 'RECEIPT',
                    date: now,
                    cashboxId: intent.cashboxId,
                    partyId: intent.partyId,
                    currencyId: currency.id,
                    exchangeRate: 1,
                    fiscalPeriodId: fiscalPeriod.id,
                    amount: totals.total,
                    unallocatedAmount: totals.total,
                    createdBy: intent.userId,
                },
                include: { fiscalPeriod: { select: { status: true } } },
            });

            const paymentIntent: PaymentRecordedIntent = {
                kind: 'PAYMENT_RECORDED',
                tenantId,
                userId: intent.userId,
                date: payment.date,
                fiscalPeriodId: payment.fiscalPeriodId,
                fiscalPeriodStatus: payment.fiscalPeriod?.status,
                exchangeRate: 1,
                referenceId: payment.id,
                description: `Payment ${payment.number}`,
                type: 'RECEIPT',
                partyId: payment.partyId,
                amount: totals.total,
                cashboxId: intent.cashboxId,
                currencyId: currency.id,
            };
            await this.payments.postInTx(tx, payment.id, intent.cashboxId, totals.total, intent.userId, paymentIntent);
            await this.payments.allocateInTx(tx, tenantId, payment.id, postedInvoice.id, totals.total);

            return {
                invoiceId: postedInvoice.id,
                invoiceNumber: postedInvoice.number,
                paymentId: payment.id,
                paymentNumber: payment.number,
                total: totals.total,
                date: postedInvoice.date,
                replayed: false,
            };
        });
    }
}
