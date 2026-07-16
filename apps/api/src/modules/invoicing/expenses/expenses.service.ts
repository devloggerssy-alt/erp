import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseItemDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { JournalPostingService } from '../../accounting/accounts/services/journal-posting.service';
import { assertAccountFitsSlot } from '../../accounting/accounts/utils/assert-account-fits-slot';
import { buildExpenseJournalLines } from './expense-journal';

@Injectable()
export class ExpensesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly journalPosting: JournalPostingService,
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
                fiscalPeriod: { select: { status: true } },
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
                exchangeRate: dto.exchangeRate ?? 1,
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

        const exchangeRate = Number(expense.exchangeRate);
        const totalAmount = Number(expense.totalAmount);

        const accountIds = Array.from(new Set([
            ...expense.items.map((i) => i.accountId),
            expense.cashbox.linkedAccountId,
        ]));
        const accounts = await this.prisma.chartOfAccount.findMany({
            where: { id: { in: accountIds }, tenantId },
            select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true, isActive: true },
        });
        const byId = new Map(accounts.map((a) => [a.id, a]));
        for (const item of expense.items) {
            assertAccountFitsSlot(byId.get(item.accountId) ?? null, 'EXPENSE' as any, 'defaultPurchase');
        }
        assertAccountFitsSlot(byId.get(expense.cashbox.linkedAccountId) ?? null, 'ASSET' as any, 'defaultReceivable');

        const lines = buildExpenseJournalLines({
            totalAmount: totalAmount * exchangeRate,
            cashboxAccountId: expense.cashbox.linkedAccountId,
            items: expense.items.map((it) => ({
                accountId: it.accountId,
                amount: Number(it.amount) * exchangeRate,
                description: it.description,
                sortOrder: it.sortOrder,
            })),
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            const entry = await this.journalPosting.post(tx, {
                tenantId,
                number: jeNumber,
                date: expense.date,
                fiscalPeriodId: expense.fiscalPeriodId,
                fiscalPeriodStatus: expense.fiscalPeriod?.status,
                referenceType: ReferenceType.EXPENSE,
                referenceId: expense.id,
                description: `Expense ${expense.number}`,
                exchangeRate,
                userId,
                lines,
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

        const original = await this.prisma.journalEntry.findFirst({
            where: { tenantId, referenceType: ReferenceType.EXPENSE, referenceId: expense.id, status: 'POSTED' },
        });
        if (!original) {
            throw new BadRequestException('Original journal entry not found for this expense.');
        }

        const exchangeRate = Number(expense.exchangeRate);
        const totalAmount = Number(expense.totalAmount);
        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            await this.journalPosting.reverse(tx, {
                tenantId,
                number: jeNumber,
                originalEntryId: original.id,
                referenceType: ReferenceType.EXPENSE_CANCELLATION,
                referenceId: expense.id,
                description: `Reversal of expense ${expense.number}`,
                exchangeRate,
                userId,
                reversalDate: expense.date,
                fiscalPeriodId: expense.fiscalPeriodId,
                fiscalPeriodStatus: expense.fiscalPeriod?.status,
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
