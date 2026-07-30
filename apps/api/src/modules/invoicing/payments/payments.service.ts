import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import { StatusGuardedCrudService } from '@devloggers/backend-core';
import { resources } from '@devloggers/api-contracts';
import type { Payment } from '@devloggers/db-prisma';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentPresenter } from './presenters/payment.presenter';
import { CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from './dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { AccountingPostingFacade, type PaymentRecordedIntent, type PaymentCancelledIntent } from '../../accounting/posting';

@Injectable()
export class PaymentsService extends StatusGuardedCrudService<Payment, PaymentResponseDto, CreatePaymentDto, UpdatePaymentDto> {
  protected readonly resourceName = resources.payments.key;
  protected readonly documentType = 'PAYMENT';

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentPresenter: PaymentPresenter,
    private readonly docSeqService: DocumentSequencesService,
    private readonly prisma: PrismaService,
    private readonly postingFacade: AccountingPostingFacade,
  ) {
    super(paymentsRepository, paymentPresenter, docSeqService);
  }

  override async list(tenantId: string, options: Record<string, any>) {
    const result = await this.paymentsRepository.findManyWithRelations(tenantId, {
      skip: options.skip,
      take: options.take,
      where: options.where,
    });
    return {
      data: this.paymentPresenter.toResponseList(result.data as any),
      total: result.total,
    };
  }

  override async findById(tenantId: string, id: string): Promise<PaymentResponseDto> {
    const entity = await this.paymentsRepository.findByIdWithDetail(tenantId, id);
    if (!entity) throw new NotFoundException('Payment not found');
    return this.paymentPresenter.toResponse(entity as any);
  }

  async createAs(tenantId: string, userId: string, dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const docType = dto.type === 'RECEIPT' ? 'RECEIPT'
      : dto.type === 'PAYMENT' ? 'PAYMENT'
      : 'PAYMENT_ADJUSTMENT';

    const number = await this.numberAllocator.getNextNumber(tenantId, docType);

    const payment = await this.prisma.payment.create({
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

    if (dto.complete) {
      return this.post(tenantId, payment.id, userId);
    }

    return this.paymentPresenter.toResponse(payment as any);
  }

  async post(tenantId: string, id: string, userId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findByIdWithDetail(tenantId, id);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'DRAFT') throw new BadRequestException('Only draft payments can be posted');

    const cashbox = await this.prisma.cashbox.findUnique({ where: { id: payment.cashboxId } });
    if (!cashbox?.linkedAccountId) {
      throw new BadRequestException('Cashbox has no linked GL account; cannot post the payment');
    }

    const exchangeRate = Number(payment.exchangeRate);
    const amount = Number(payment.amount);
    const isReceipt = payment.type === 'RECEIPT';
    const balanceDelta = isReceipt ? amount : -amount;

    const intent: PaymentRecordedIntent = {
      kind: 'PAYMENT_RECORDED',
      tenantId,
      userId,
      date: payment.date,
      fiscalPeriodId: payment.fiscalPeriodId,
      fiscalPeriodStatus: (payment as any).fiscalPeriod?.status,
      exchangeRate,
      referenceId: payment.id,
      description: `Payment ${payment.number}`,
      type: payment.type as 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT',
      partyId: payment.partyId ?? null,
      amount,
      cashboxAccountId: cashbox.linkedAccountId,
    };

    await this.prisma.$transaction(async (tx) => {
      await this.postingFacade.record(tx, intent);

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

  async cancel(tenantId: string, id: string, userId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findByIdWithDetail(tenantId, id);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be cancelled');
    if (Number(payment.allocatedAmount) > 0) {
      throw new BadRequestException('Cannot cancel a payment with existing allocations. Remove allocations first.');
    }

    const cashbox = await this.prisma.cashbox.findUnique({ where: { id: payment.cashboxId } });
    if (!cashbox?.linkedAccountId) {
      throw new BadRequestException('Cashbox has no linked GL account; cannot cancel the payment');
    }

    const isReceipt = payment.type === 'RECEIPT';
    const exchangeRate = Number(payment.exchangeRate);
    const amount = Number(payment.amount);
    const reverseDelta = isReceipt ? -amount : amount;

    const original = await this.prisma.journalEntry.findFirst({
      where: { tenantId, referenceType: ReferenceType.PAYMENT, referenceId: payment.id, status: 'POSTED' },
    });
    if (!original) {
      throw new BadRequestException('Original journal entry not found for this payment.');
    }

    const intent: PaymentCancelledIntent = {
      kind: 'PAYMENT_CANCELLED',
      tenantId,
      userId,
      date: payment.date,
      fiscalPeriodId: payment.fiscalPeriodId,
      fiscalPeriodStatus: (payment as any).fiscalPeriod?.status,
      exchangeRate,
      referenceId: payment.id,
      description: `Reversal of payment ${payment.number}`,
      originalEntryId: original.id,
    };

    await this.prisma.$transaction(async (tx) => {
      await this.postingFacade.reverse(tx, intent);

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
    const payment = await this.paymentsRepository.findByIdWithDetail(tenantId, paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be allocated');

    const unallocated = Number(payment.unallocatedAmount);
    if (dto.amount > unallocated) {
      throw new BadRequestException(`Allocation amount (${dto.amount}) exceeds unallocated balance (${unallocated})`);
    }

    const invoice = await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (payment.partyId && payment.partyId !== invoice.partyId) {
      throw new BadRequestException('Payment and invoice belong to different parties');
    }
    if (payment.currencyId !== invoice.currencyId) {
      throw new BadRequestException('Payment and invoice currencies do not match');
    }

    const allocatedAgg = await this.prisma.paymentAllocation.aggregate({
      where: { tenantId, invoiceId: dto.invoiceId },
      _sum: { amount: true },
    });
    const invoiceRemaining = Number(invoice.total) - Number(allocatedAgg._sum.amount ?? 0);
    if (dto.amount > invoiceRemaining) {
      throw new BadRequestException(`Allocation amount (${dto.amount}) exceeds the invoice's remaining balance (${invoiceRemaining})`);
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
