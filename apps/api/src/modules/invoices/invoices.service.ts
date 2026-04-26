import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceLineDto } from './dto';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';

@Injectable()
export class InvoicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly documentSequencesService: DocumentSequencesService,
    ) {}

    /**
     * Compute line-level totals server-side to ensure accuracy.
     */
    private computeLineTotals(line: InvoiceLineDto) {
        const lineSubtotal = line.quantity * line.unitPrice;
        const discountPercent = line.discountPercent || 0;
        const discountAmount = lineSubtotal * (discountPercent / 100);
        const afterDiscount = lineSubtotal - discountAmount;
        const taxPercent = line.taxPercent || 0;
        const taxAmount = afterDiscount * (taxPercent / 100);
        const total = afterDiscount + taxAmount;

        return { discountAmount, taxAmount, total };
    }

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
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
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

        // Compute totals
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        const processedLines = dto.lines.map((line, index) => {
            const lineSubtotal = line.quantity * line.unitPrice;
            const computed = this.computeLineTotals(line);

            subtotal += lineSubtotal;
            totalDiscount += computed.discountAmount;
            totalTax += computed.taxAmount;

            return {
                tenantId,
                itemId: line.itemId,
                unitId: line.unitId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent || 0,
                discountAmount: computed.discountAmount,
                taxPercent: line.taxPercent || 0,
                taxAmount: computed.taxAmount,
                total: computed.total,
                notes: line.notes,
                sortOrder: line.sortOrder ?? index,
            };
        });

        const grandTotal = subtotal - totalDiscount + totalTax;

        return this.prisma.invoice.create({
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
                subtotal,
                discountAmount: totalDiscount,
                taxAmount: totalTax,
                total: grandTotal,
                notes: dto.notes,
                createdBy: userId,
                lines: {
                    create: processedLines,
                },
            },
            include: {
                lines: true,
                invoiceType: true,
            },
        });
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

            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;

            const processedLines = dto.lines.map((line, index) => {
                const lineSubtotal = line.quantity * line.unitPrice;
                const computed = this.computeLineTotals(line);

                subtotal += lineSubtotal;
                totalDiscount += computed.discountAmount;
                totalTax += computed.taxAmount;

                return {
                    tenantId,
                    itemId: line.itemId,
                    unitId: line.unitId,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    discountPercent: line.discountPercent || 0,
                    discountAmount: computed.discountAmount,
                    taxPercent: line.taxPercent || 0,
                    taxAmount: computed.taxAmount,
                    total: computed.total,
                    notes: line.notes,
                    sortOrder: line.sortOrder ?? index,
                };
            });

            const grandTotal = subtotal - totalDiscount + totalTax;

            updateData.subtotal = subtotal;
            updateData.discountAmount = totalDiscount;
            updateData.taxAmount = totalTax;
            updateData.total = grandTotal;
            updateData.lines = { create: processedLines };
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
}
