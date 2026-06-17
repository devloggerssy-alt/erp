import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../accounting/financial-settings/services/financial-settings.service';
import { buildPaymentJournalLines } from './payment-journal';
import { updateAccountBalances } from '../../accounting/accounts/utils/account-balance.utils';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly financialSettingsService: FinancialSettingsService,
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
                party: { select: { name: true, receivableAccountId: true, payableAccountId: true } },
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
                exchangeRate: dto.exchangeRate ?? 1,
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
            data.unallocatedAmount = dto.amount;
        }
        return this.prisma.payment.update({ where: { id }, data });
    }

    async post(tenantId: string, id: string, userId: string) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'DRAFT') throw new BadRequestException('Only draft payments can be posted');

        const cashbox = await this.prisma.cashbox.findUnique({ where: { id: payment.cashboxId } });
        if (!cashbox?.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked GL account; cannot post the payment');
        }

        const settings = await this.financialSettingsService.getOrThrow(tenantId);
        const isReceipt = payment.type === 'RECEIPT';

        const counterpartAccountId = isReceipt
            ? (payment.party?.receivableAccountId ?? settings.defaultReceivableAccountId)
            : (payment.party?.payableAccountId ?? settings.defaultPayableAccountId);

        if (!counterpartAccountId) {
            throw new BadRequestException(
                isReceipt
                    ? 'No Accounts Receivable account configured. Set a default in Financial Settings or on the party.'
                    : 'No Accounts Payable account configured. Set a default in Financial Settings or on the party.',
            );
        }

        const exchangeRate = Number(payment.exchangeRate);
        const amount = Number(payment.amount);
        const balanceDelta = isReceipt ? amount : -amount;

        const journalLines = buildPaymentJournalLines({
            type: payment.type as 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT',
            amount,
            exchangeRate,
            cashboxAccountId: cashbox.linkedAccountId,
            counterpartAccountId,
            partyId: payment.partyId ?? null,
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            await tx.journalEntry.create({
                data: {
                    tenantId,
                    number: jeNumber,
                    date: payment.date,
                    fiscalPeriodId: payment.fiscalPeriodId,
                    referenceType: 'payment',
                    referenceId: payment.id,
                    description: `Payment ${payment.number}`,
                    status: 'POSTED',
                    exchangeRate,
                    postedAt: new Date(),
                    createdBy: userId,
                    lines: {
                        create: journalLines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            partyId: l.partyId ?? null,
                            debit: l.debit,
                            credit: l.credit,
                            description: l.description,
                            sortOrder: l.sortOrder,
                        })),
                    },
                },
            });

            await updateAccountBalances(tx, journalLines);

            await tx.cashbox.update({
                where: { id: payment.cashboxId },
                data: { balance: { increment: balanceDelta } },
            });

            await tx.payment.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    async cancel(tenantId: string, id: string, userId: string) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be cancelled');
        if (Number(payment.allocatedAmount) > 0) {
            throw new BadRequestException('Cannot cancel a payment with existing allocations. Remove allocations first.');
        }

        const cashbox = await this.prisma.cashbox.findUnique({ where: { id: payment.cashboxId } });
        if (!cashbox?.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked GL account; cannot cancel the payment');
        }

        const settings = await this.financialSettingsService.getOrThrow(tenantId);
        const isReceipt = payment.type === 'RECEIPT';

        const counterpartAccountId = isReceipt
            ? (payment.party?.receivableAccountId ?? settings.defaultReceivableAccountId ?? '')
            : (payment.party?.payableAccountId ?? settings.defaultPayableAccountId ?? '');

        const exchangeRate = Number(payment.exchangeRate);
        const amount = Number(payment.amount);
        const reverseDelta = isReceipt ? -amount : amount;

        const reversalLines = buildPaymentJournalLines(
            {
                type: payment.type as 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT',
                amount,
                exchangeRate,
                cashboxAccountId: cashbox.linkedAccountId,
                counterpartAccountId,
                partyId: payment.partyId ?? null,
            },
            { reverse: true },
        );

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            await tx.journalEntry.create({
                data: {
                    tenantId,
                    number: jeNumber,
                    date: new Date(),
                    fiscalPeriodId: payment.fiscalPeriodId,
                    referenceType: 'payment_cancellation',
                    referenceId: payment.id,
                    description: `Reversal of payment ${payment.number}`,
                    status: 'POSTED',
                    exchangeRate,
                    postedAt: new Date(),
                    createdBy: userId,
                    lines: {
                        create: reversalLines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            partyId: l.partyId ?? null,
                            debit: l.debit,
                            credit: l.credit,
                            description: l.description,
                            sortOrder: l.sortOrder,
                        })),
                    },
                },
            });

            await updateAccountBalances(tx, reversalLines);

            await tx.cashbox.update({
                where: { id: payment.cashboxId },
                data: { balance: { increment: reverseDelta } },
            });

            await tx.payment.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    async allocate(tenantId: string, paymentId: string, dto: AllocatePaymentDto) {
        const payment = await this.findById(tenantId, paymentId);
        if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be allocated');

        const unallocated = Number(payment.unallocatedAmount);
        if (dto.amount > unallocated) {
            throw new BadRequestException(`Allocation amount (${dto.amount}) exceeds unallocated balance (${unallocated})`);
        }

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
