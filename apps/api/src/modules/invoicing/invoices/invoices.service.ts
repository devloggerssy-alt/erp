import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateInvoiceDto, UpdateInvoiceDto, AddInvoicePaymentDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { InvoicePostingService } from './invoice-posting.service';
import { PaymentsService } from '../payments/payments.service';
import { CreatePaymentDto, PaymentTypeEnum } from '../payments/dto';
import { computeInvoicePaidState } from './presenters/invoice.presenter';
import { computeInvoiceTotals } from './invoice-totals';

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly documentSequencesService: DocumentSequencesService,
        private readonly postingService: InvoicePostingService,
        private readonly paymentsService: PaymentsService,
    ) {}

    async findAll(tenantId: string, filters: {
        direction?: string;
        status?: string;
        partyId?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (filters.status) where.status = filters.status;
        if (filters.partyId) where.partyId = filters.partyId;
        if (filters.direction) {
            where.invoiceType = { direction: filters.direction };
        }

        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                include: {
                    invoiceType: { select: { code: true, name: true, direction: true } },
                    party: { select: { name: true, code: true } },
                    warehouse: { select: { name: true, code: true } },
                    currency: { select: { code: true, symbol: true } },
                    paymentAllocations: { select: { amount: true } },
                    _count: { select: { lines: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
            include: {
                invoiceType: true,
                party: true,
                warehouse: true,
                currency: true,
                fiscalPeriod: true,
                lines: {
                    include: {
                        item: { select: { name: true, code: true } },
                        unit: { select: { name: true, abbreviation: true } },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                paymentAllocations: {
                    include: { payment: { select: { number: true, date: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
    }

    /**
     * Create (and, if requested, post + allocate) a payment against an invoice.
     * Shared by the opening-payment path in `create()` and the `addPayment()` endpoint.
     * Throws if post/allocate fails past the initial DRAFT payment creation — it's up
     * to the caller to decide whether that's fatal (addPayment) or best-effort (opening
     * payment, where the invoice itself is already saved and shouldn't be lost).
     */
    private async recordInvoicePayment(
        tenantId: string,
        userId: string,
        invoice: { id: string; partyId: string; currencyId: string; fiscalPeriodId: string; exchangeRate: unknown },
        direction: 'PURCHASE' | 'SALE',
        dto: { cashboxId: string; amount: number; date: string; exchangeRate?: number },
        complete: boolean,
    ): Promise<void> {
        const paymentDto: CreatePaymentDto = {
            type: direction === 'PURCHASE' ? PaymentTypeEnum.PAYMENT : PaymentTypeEnum.RECEIPT,
            date: dto.date,
            cashboxId: dto.cashboxId,
            partyId: invoice.partyId,
            currencyId: invoice.currencyId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            amount: dto.amount,
            exchangeRate: dto.exchangeRate ?? Number(invoice.exchangeRate),
        };
        const payment = await this.paymentsService.createAs(tenantId, userId, paymentDto);

        if (!complete) return;

        await this.paymentsService.post(tenantId, payment.id, userId);
        await this.paymentsService.allocate(tenantId, payment.id, { invoiceId: invoice.id, amount: dto.amount });
    }

    async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
        if (!dto.lines || dto.lines.length === 0) {
            throw new BadRequestException('Invoice must have at least one line');
        }

        // Determine document type from invoice type
        const invoiceType = await this.prisma.invoiceType.findFirst({
            where: { id: dto.invoiceTypeId, tenantId },
        });
        if (!invoiceType) {
            throw new NotFoundException('Invoice type not found');
        }

        const documentType = invoiceType.direction === 'PURCHASE'
            ? 'PURCHASE_INVOICE'
            : 'SALES_INVOICE';

        // Get next number from sequence
        const number = await this.documentSequencesService.getNextNumber(tenantId, documentType);

        const totals = computeInvoiceTotals(tenantId, dto.lines);

        const created = await this.prisma.invoice.create({
            data: {
                tenantId,
                invoiceTypeId: dto.invoiceTypeId,
                number,
                date: new Date(dto.date),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                partyId: dto.partyId,
                warehouseId: dto.warehouseId,
                fiscalPeriodId: dto.fiscalPeriodId,
                currencyId: dto.currencyId,
                exchangeRate: dto.exchangeRate ?? 1,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxAmount: totals.taxAmount,
                total: totals.total,
                notes: dto.notes,
                createdBy: userId,
                lines: {
                    create: totals.lines,
                },
            },
            include: {
                lines: true,
                invoiceType: true,
            },
        });

        // Complete + opening payment are both best-effort follow-ups: the invoice row
        // above is already committed, so a failure here must not look like the whole
        // create failed — it's reported but the invoice remains saved as DRAFT.
        let finalInvoice: typeof created = created;
        // Normalized at the catch so the rethrow below stays a real Error.
        // HttpException extends Error, so a posting failure keeps its status code.
        let postingError: Error | undefined;

        if (dto.complete) {
            try {
                finalInvoice = invoiceType.direction === 'PURCHASE'
                    ? await this.postingService.postPurchaseInvoice(tenantId, created.id, userId)
                    : await this.postingService.postSalesInvoice(tenantId, created.id, userId);
            } catch (error) {
                postingError = error instanceof Error
                    ? error
                    : new Error(`Invoice posting failed for invoice ${created.id}`);
            }
        }

        if (dto.openingPayment) {
            // Only post + allocate the opening payment if the invoice itself was
            // posted — an opening payment against a still-draft invoice stays draft too.
            // Best-effort: the invoice is already saved, so a failure here is reported
            // but must not roll back or fail the whole request.
            try {
                await this.recordInvoicePayment(
                    tenantId,
                    userId,
                    {
                        id: created.id,
                        partyId: dto.partyId,
                        currencyId: dto.currencyId,
                        fiscalPeriodId: dto.fiscalPeriodId,
                        exchangeRate: dto.exchangeRate ?? 1,
                    },
                    invoiceType.direction,
                    {
                        cashboxId: dto.openingPayment.cashboxId,
                        amount: dto.openingPayment.amount,
                        date: dto.date,
                        exchangeRate: dto.openingPayment.exchangeRate,
                    },
                    finalInvoice.status === 'POSTED',
                );
            } catch (error) {
                this.logger.warn(
                    `Opening payment for invoice ${created.id} could not be completed: ${(error as Error).message}`,
                );
            }
        }

        if (postingError) {
            throw postingError;
        }

        // Re-fetch so the response reflects any opening-payment allocation applied above.
        return this.findById(tenantId, created.id);
    }

    async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
        const existing = await this.findById(tenantId, id);

        if (existing.status !== 'DRAFT') {
            throw new BadRequestException('Only draft invoices can be edited');
        }

        // If lines are provided, recompute totals
        const updateData: any = {};
        if (dto.date) updateData.date = new Date(dto.date);
        if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        if (dto.partyId) updateData.partyId = dto.partyId;
        if (dto.warehouseId !== undefined) updateData.warehouseId = dto.warehouseId;
        if (dto.currencyId) updateData.currencyId = dto.currencyId;
        if (dto.notes !== undefined) updateData.notes = dto.notes;

        if (dto.lines && dto.lines.length > 0) {
            // Delete existing lines and recreate
            await this.prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });

            const totals = computeInvoiceTotals(tenantId, dto.lines);

            updateData.subtotal = totals.subtotal;
            updateData.discountAmount = totals.discountAmount;
            updateData.taxAmount = totals.taxAmount;
            updateData.total = totals.total;
            updateData.lines = { create: totals.lines };
        }

        return this.prisma.invoice.update({
            where: { id },
            data: updateData,
            include: {
                lines: true,
                invoiceType: true,
            },
        });
    }

    /**
     * Record an additional payment against an already-posted invoice — the
     * mechanism for bringing a PARTIAL invoice toward PAID over time. Unlike the
     * opening-payment path, failures here propagate: the caller explicitly asked
     * for this payment to be recorded now, so a silent no-op would be misleading.
     */
    async addPayment(tenantId: string, userId: string, invoiceId: string, dto: AddInvoicePaymentDto) {
        const invoice = await this.findById(tenantId, invoiceId);
        if (invoice.status !== 'POSTED') {
            throw new BadRequestException('Payments can only be added to posted invoices');
        }

        const { balanceDue } = computeInvoicePaidState(invoice.total, invoice.paymentAllocations);
        if (dto.amount > balanceDue) {
            throw new BadRequestException(`Payment amount (${dto.amount}) exceeds the invoice's remaining balance (${balanceDue})`);
        }

        await this.recordInvoicePayment(
            tenantId,
            userId,
            {
                id: invoice.id,
                partyId: invoice.partyId,
                currencyId: invoice.currencyId,
                fiscalPeriodId: invoice.fiscalPeriodId,
                exchangeRate: invoice.exchangeRate,
            },
            invoice.invoiceType.direction,
            {
                cashboxId: dto.cashboxId,
                amount: dto.amount,
                date: dto.date,
                exchangeRate: dto.exchangeRate,
            },
            true,
        );

        return this.findById(tenantId, invoiceId);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const invoice = await this.findById(tenantId, id);
        if (invoice.status !== 'DRAFT') {
            throw new BadRequestException('Only draft invoices can be deleted. Posted invoices must be cancelled.');
        }

        await this.prisma.$transaction(async (tx) => {
            // Cascade polymorphic children first (no FK constraints)
            await Promise.all([
                tx.tagAssignment.deleteMany({ where: { tenantId, entityType: 'invoices', entityId: id } }),
                tx.customFieldValue.deleteMany({ where: { tenantId, entityType: 'invoices', entityId: id } }),
            ]);
            // Delete lines explicitly (no DB cascade on invoiceId FK)
            await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id } });
        });
    }
}
