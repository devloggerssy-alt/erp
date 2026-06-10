import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseItemDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { buildExpenseJournalLines } from './expense-journal';

@Injectable()
export class ExpensesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
    ) {}

    async findAll(tenantId: string, filters: { status?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const where: any = { tenantId };
        if (filters.status) where.status = filters.status;

        const [data, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                include: {
                    cashbox: { select: { name: true, code: true } },
                    currency: { select: { code: true, symbol: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.expense.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, tenantId },
            include: {
                cashbox: true,
                currency: true,
                fiscalPeriod: true,
                items: { orderBy: { sortOrder: 'asc' } },
            },
        });
        if (!expense) throw new NotFoundException('Expense not found');
        return expense;
    }

    async create(tenantId: string, userId: string, dto: CreateExpenseDto) {
        const number = await this.docSeqService.getNextNumber(tenantId, 'EXPENSE');
        const totalAmount = dto.items.reduce((s, it) => s + it.amount, 0);

        return this.prisma.expense.create({
            data: {
                tenantId,
                number,
                date: new Date(dto.date),
                cashboxId: dto.cashboxId,
                currencyId: dto.currencyId,
                fiscalPeriodId: dto.fiscalPeriodId,
                totalAmount,
                notes: dto.notes,
                createdBy: userId,
                items: { create: this.mapItems(tenantId, dto.items) },
            },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateExpenseDto) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be edited');

        const data: any = {};
        if (dto.date) data.date = new Date(dto.date);
        if (dto.cashboxId) data.cashboxId = dto.cashboxId;
        if (dto.currencyId) data.currencyId = dto.currencyId;
        if (dto.fiscalPeriodId) data.fiscalPeriodId = dto.fiscalPeriodId;
        if (dto.notes !== undefined) data.notes = dto.notes;

        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.expenseItem.deleteMany({ where: { expenseId: id } });
                data.items = { create: this.mapItems(tenantId, dto.items) };
                data.totalAmount = dto.items.reduce((s, it) => s + it.amount, 0);
            }
            return tx.expense.update({
                where: { id },
                data,
                include: { items: { orderBy: { sortOrder: 'asc' } } },
            });
        });
    }

    async remove(tenantId: string, id: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be deleted');
        await this.prisma.expense.delete({ where: { id } });
    }

    async post(tenantId: string, id: string, userId: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be posted');
        if (expense.items.length === 0) throw new BadRequestException('Expense must have at least one item');
        if (!expense.cashbox.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked account; cannot post the expense');
        }

        const totalAmount = Number(expense.totalAmount);
        const lines = buildExpenseJournalLines({
            totalAmount,
            cashboxAccountId: expense.cashbox.linkedAccountId,
            items: expense.items.map((it) => ({
                accountId: it.accountId,
                amount: Number(it.amount),
                description: it.description,
                sortOrder: it.sortOrder,
            })),
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    number: jeNumber,
                    date: expense.date,
                    fiscalPeriodId: expense.fiscalPeriodId,
                    referenceType: 'expense',
                    referenceId: expense.id,
                    description: `Expense ${expense.number}`,
                    status: 'POSTED',
                    postedAt: new Date(),
                    createdBy: userId,
                    lines: {
                        create: lines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            debit: l.debit,
                            credit: l.credit,
                            description: l.description,
                            sortOrder: l.sortOrder,
                        })),
                    },
                },
            });

            await tx.cashbox.update({
                where: { id: expense.cashboxId },
                data: { balance: { decrement: totalAmount } },
            });

            await tx.expense.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId, journalEntryId: entry.id },
            });
        });

        return this.findById(tenantId, id);
    }

    async cancel(tenantId: string, id: string, userId: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'POSTED') throw new BadRequestException('Only posted expenses can be cancelled');
        if (!expense.cashbox.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked account; cannot cancel the expense');
        }

        const totalAmount = Number(expense.totalAmount);
        const lines = buildExpenseJournalLines(
            {
                totalAmount,
                cashboxAccountId: expense.cashbox.linkedAccountId,
                items: expense.items.map((it) => ({
                    accountId: it.accountId,
                    amount: Number(it.amount),
                    description: it.description,
                    sortOrder: it.sortOrder,
                })),
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
                    fiscalPeriodId: expense.fiscalPeriodId,
                    referenceType: 'expense_cancellation',
                    referenceId: expense.id,
                    description: `Reversal of expense ${expense.number}`,
                    status: 'POSTED',
                    postedAt: new Date(),
                    createdBy: userId,
                    lines: {
                        create: lines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            debit: l.debit,
                            credit: l.credit,
                            description: l.description,
                            sortOrder: l.sortOrder,
                        })),
                    },
                },
            });

            await tx.cashbox.update({
                where: { id: expense.cashboxId },
                data: { balance: { increment: totalAmount } },
            });

            await tx.expense.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    private mapItems(tenantId: string, items: CreateExpenseItemDto[]) {
        return items.map((it, i) => ({
            tenantId,
            accountId: it.accountId,
            description: it.description,
            amount: it.amount,
            notes: it.notes,
            sortOrder: it.sortOrder ?? i,
        }));
    }
}
