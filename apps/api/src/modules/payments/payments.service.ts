import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from './dto';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
    ) {}

    async findAll(tenantId: string, filters: { type?: string; status?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const where: any = { tenantId };
        if (filters.type) where.type = filters.type;
        if (filters.status) where.status = filters.status;

        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    cashbox: { select: { name: true, code: true } },
                    party: { select: { name: true } },
                    currency: { select: { code: true, symbol: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const payment = await this.prisma.payment.findFirst({
            where: { id, tenantId },
            include: {
                cashbox: true,
                party: true,
                currency: true,
                fiscalPeriod: true,
                allocations: { include: { invoice: { select: { number: true, total: true } } } },
            },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async create(tenantId: string, userId: string, dto: CreatePaymentDto) {
        const docType = dto.type === 'RECEIPT' ? 'RECEIPT'
            : dto.type === 'PAYMENT' ? 'PAYMENT'
            : dto.type === 'EXPENSE' ? 'EXPENSE'
            : 'PAYMENT_ADJUSTMENT';

        const number = await this.docSeqService.getNextNumber(tenantId, docType);

        return this.prisma.payment.create({
            data: {
                tenantId,
                number,
                type: dto.type,
                date: new Date(dto.date),
                cashboxId: dto.cashboxId,
                partyId: dto.partyId,
                currencyId: dto.currencyId,
                fiscalPeriodId: dto.fiscalPeriodId,
                amount: dto.amount,
                unallocatedAmount: dto.amount,
                notes: dto.notes,
                createdBy: userId,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdatePaymentDto) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'DRAFT') throw new BadRequestException('Only draft payments can be edited');
        const data: any = {};
        if (dto.date) data.date = new Date(dto.date);
        if (dto.cashboxId) data.cashboxId = dto.cashboxId;
        if (dto.partyId !== undefined) data.partyId = dto.partyId;
        if (dto.notes !== undefined) data.notes = dto.notes;
        if (dto.amount) {
            data.amount = dto.amount;
            data.unallocatedAmount = dto.amount; // reset if amount changed
        }
        return this.prisma.payment.update({ where: { id }, data });
    }

    async post(tenantId: string, id: string, userId: string) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'DRAFT') throw new BadRequestException('Only draft payments can be posted');

        // Update cashbox balance
        const balanceDelta = payment.type === 'RECEIPT'
            ? Number(payment.amount)   // receipts add to cashbox
            : -Number(payment.amount); // payments/expenses/adjustments deduct

        await this.prisma.$transaction([
            this.prisma.cashbox.update({
                where: { id: payment.cashboxId },
                data: { balance: { increment: balanceDelta } },
            }),
            this.prisma.payment.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
            }),
        ]);

        return this.findById(tenantId, id);
    }

    async cancel(tenantId: string, id: string, userId: string) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be cancelled');
        if (Number(payment.allocatedAmount) > 0) {
            throw new BadRequestException('Cannot cancel a payment with existing allocations. Remove allocations first.');
        }

        // Reverse cashbox balance
        const balanceDelta = payment.type === 'RECEIPT'
            ? -Number(payment.amount)
            : Number(payment.amount);

        await this.prisma.$transaction([
            this.prisma.cashbox.update({
                where: { id: payment.cashboxId },
                data: { balance: { increment: balanceDelta } },
            }),
            this.prisma.payment.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
            }),
        ]);

        return this.findById(tenantId, id);
    }

    async allocate(tenantId: string, paymentId: string, dto: AllocatePaymentDto) {
        const payment = await this.findById(tenantId, paymentId);
        if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be allocated');

        const unallocated = Number(payment.unallocatedAmount);
        if (dto.amount > unallocated) {
            throw new BadRequestException(`Allocation amount (${dto.amount}) exceeds unallocated balance (${unallocated})`);
        }

        // Create allocation and update amounts atomically
        return this.prisma.$transaction(async (tx) => {
            const allocation = await tx.paymentAllocation.create({
                data: { tenantId, paymentId, invoiceId: dto.invoiceId, amount: dto.amount },
            });

            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    allocatedAmount: { increment: dto.amount },
                    unallocatedAmount: { decrement: dto.amount },
                },
            });

            return allocation;
        });
    }

    async removeAllocation(tenantId: string, paymentId: string, allocationId: string) {
        const allocation = await this.prisma.paymentAllocation.findFirst({
            where: { id: allocationId, paymentId, tenantId },
        });
        if (!allocation) throw new NotFoundException('Allocation not found');

        return this.prisma.$transaction(async (tx) => {
            await tx.paymentAllocation.delete({ where: { id: allocationId } });
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    allocatedAmount: { decrement: Number(allocation.amount) },
                    unallocatedAmount: { increment: Number(allocation.amount) },
                },
            });
        });
    }
}
