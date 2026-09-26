import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { InvoiceStatus } from '@devloggers/db-prisma';
import { AiIdDto, AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { InvoicesService } from './invoices.service';
import { InvoicePresenter } from './presenters/invoice.presenter';
import type { InvoiceResponseDto } from './dto';

const DEFAULT_LIMIT = 20;
const DIRECTIONS = ['SALE', 'PURCHASE'];
const STATUSES = Object.values(InvoiceStatus);

export class AiInvoiceListDto extends AiPageDto {
    @ApiPropertyOptional({ enum: DIRECTIONS, description: 'SALE (to customers) or PURCHASE (from suppliers)' })
    @IsOptional()
    @IsIn(DIRECTIONS)
    direction?: string;

    @ApiPropertyOptional({ enum: STATUSES, description: 'Document status' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: InvoiceStatus;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Customer or supplier id' })
    @IsOptional()
    @IsUUID()
    partyId?: string;
}

function toRow(invoice: InvoiceResponseDto) {
    return {
        id: invoice.id,
        number: invoice.number,
        date: invoice.date,
        type: invoice.invoiceTypeName,
        direction: invoice.invoiceTypeDirection,
        partyName: invoice.partyName,
        status: invoice.status,
        paidStatus: invoice.paidStatus,
        currency: invoice.currencyCode,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
    };
}

@AiToolProvider()
@Injectable()
export class InvoicesAiTools implements AiToolSource {
    constructor(
        private readonly invoices: InvoicesService,
        private readonly presenter: InvoicePresenter,
    ) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'invoices.list',
                domain: 'invoicing',
                resource: resources.invoices.key,
                risk: 'read',
                permission: 'invoices.view',
                description:
                    'List sales and purchase invoices, newest first, with paid status and balance due. ' +
                    'Returns { items, total, page }. Use invoices.show for lines and payments.',
                input: dtoInput(AiInvoiceListDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const result = await this.invoices.findAll(ctx.tenantId, {
                        direction: input.direction,
                        status: input.status,
                        partyId: input.partyId,
                        page,
                        limit: input.limit ?? DEFAULT_LIMIT,
                    });
                    return { items: this.presenter.toListResponseList(result.data).map(toRow), total: result.total, page };
                },
            }),
            defineAiTool({
                name: 'invoices.show',
                domain: 'invoicing',
                resource: resources.invoices.key,
                risk: 'read',
                permission: 'invoices.view',
                description: 'Get one invoice by UUID, including its lines and payment allocations.',
                input: dtoInput(AiIdDto),
                handler: async (ctx, input) => this.presenter.toDetailResponse(await this.invoices.findById(ctx.tenantId, input.id)),
            }),
        ];
    }
}
