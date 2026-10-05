import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { ExpenseStatus } from '@devloggers/db-prisma';
import { AiIdDto, AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ExpensesService } from './expenses.service';

const DEFAULT_LIMIT = 20;
const STATUSES = Object.values(ExpenseStatus);

type ExpenseListRow = Awaited<ReturnType<ExpensesService['findAll']>>['data'][number];

export class AiExpenseListDto extends AiPageDto {
    @ApiPropertyOptional({ enum: STATUSES, description: 'Document status' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: ExpenseStatus;
}

function toRow(expense: ExpenseListRow) {
    return {
        id: expense.id,
        number: expense.number,
        date: expense.date.toISOString(),
        status: expense.status,
        cashboxCode: expense.cashbox.code,
        currency: expense.currency.code,
        total: Number(expense.totalAmount),
        notes: expense.notes,
    };
}

@AiToolProvider()
@Injectable()
export class ExpensesAiTools implements AiToolSource {
    constructor(private readonly expenses: ExpensesService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'expenses.list',
                domain: 'invoicing',
                resource: resources.expenses.key,
                risk: 'read',
                permission: 'expenses.view',
                description: 'List expenses, newest first. Returns { items, total, page }. Use expenses.show for the expense lines.',
                input: dtoInput(AiExpenseListDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const result = await this.expenses.findAll(ctx.tenantId, { status: input.status, page, limit: input.limit ?? DEFAULT_LIMIT });
                    return { items: result.data.map(toRow), total: result.total, page };
                },
            }),
            defineAiTool({
                name: 'expenses.show',
                domain: 'invoicing',
                resource: resources.expenses.key,
                risk: 'read',
                permission: 'expenses.view',
                description: 'Get one expense by UUID, including its lines.',
                input: dtoInput(AiIdDto),
                handler: (ctx, input) => this.expenses.findById(ctx.tenantId, input.id),
            }),
        ];
    }
}
