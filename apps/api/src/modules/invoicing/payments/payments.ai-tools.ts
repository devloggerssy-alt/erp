import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { PaymentStatus, PaymentType } from '@devloggers/db-prisma';
import { AiIdDto, AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { PaymentsService } from './payments.service';
import type { PaymentResponseDto } from './dto';

const DEFAULT_LIMIT = 20;
const TYPES = Object.values(PaymentType);
const STATUSES = Object.values(PaymentStatus);

export class AiPaymentListDto extends AiPageDto {
    @ApiPropertyOptional({ enum: TYPES, description: 'RECEIPT (money in), PAYMENT (money out) or ADJUSTMENT' })
    @IsOptional()
    @IsIn(TYPES)
    type?: PaymentType;

    @ApiPropertyOptional({ enum: STATUSES, description: 'Document status' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: PaymentStatus;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Customer or supplier id' })
    @IsOptional()
    @IsUUID()
    partyId?: string;
}

function toRow(payment: PaymentResponseDto) {
    return {
        id: payment.id,
        number: payment.number,
        type: payment.type,
        date: payment.date,
        status: payment.status,
        partyName: payment.partyName,
        cashboxName: payment.cashboxName,
        currency: payment.currencyCode,
        amount: payment.amount,
        allocatedAmount: payment.allocatedAmount,
        unallocatedAmount: payment.unallocatedAmount,
    };
}

@AiToolProvider()
@Injectable()
export class PaymentsAiTools implements AiToolSource {
    constructor(private readonly payments: PaymentsService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'payments.list',
                domain: 'invoicing',
                resource: resources.payments.key,
                risk: 'read',
                permission: 'payments.view',
                description: 'List receipts and payments, newest first, with allocated and unallocated amounts. Returns { items, total, page }.',
                input: dtoInput(AiPaymentListDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const limit = input.limit ?? DEFAULT_LIMIT;
                    const where: Record<string, unknown> = {};
                    if (input.type) where.type = input.type;
                    if (input.status) where.status = input.status;
                    if (input.partyId) where.partyId = input.partyId;
                    const result = await this.payments.list(ctx.tenantId, { skip: (page - 1) * limit, take: limit, where, orderBy: { createdAt: 'desc' } });
                    return { items: result.data.map(toRow), total: result.total, page };
                },
            }),
            defineAiTool({
                name: 'payments.show',
                domain: 'invoicing',
                resource: resources.payments.key,
                risk: 'read',
                permission: 'payments.view',
                description: 'Get one receipt or payment by UUID, including its invoice allocations.',
                input: dtoInput(AiIdDto),
                handler: (ctx, input) => this.payments.findById(ctx.tenantId, input.id),
            }),
        ];
    }
}
