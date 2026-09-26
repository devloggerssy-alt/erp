import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ReportsService } from './reports.service';

export class AiDateRangeDto {
    @ApiPropertyOptional({ type: 'string', format: 'date', description: 'Start date, inclusive (YYYY-MM-DD)' })
    @IsOptional()
    @IsISO8601({ strict: true })
    from?: string;

    @ApiPropertyOptional({ type: 'string', format: 'date', description: 'End date, inclusive (YYYY-MM-DD)' })
    @IsOptional()
    @IsISO8601({ strict: true })
    to?: string;
}

export class AiPartyDateRangeDto extends AiDateRangeDto {
    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this customer/supplier' })
    @IsOptional()
    @IsUUID()
    partyId?: string;
}

export class AiPartyStatementDto {
    @ApiProperty({ type: 'string', format: 'uuid', description: 'Customer or supplier id (from customers.list or suppliers.list)' })
    @IsUUID()
    partyId!: string;
}

export class AiTopItemsDto extends AiDateRangeDto {
    @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 20, description: 'How many items (default 5, max 20)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    limit?: number;
}

const PERIOD_HINT = 'Dates are YYYY-MM-DD; posted documents only.';

@AiToolProvider()
@Injectable()
export class ReportsAiTools implements AiToolSource {
    constructor(private readonly reports: ReportsService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'reports.sales-summary',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: `Total sales and invoice count for a period, optionally for one customer. ${PERIOD_HINT} Use invoices.list for the rows.`,
                input: dtoInput(AiPartyDateRangeDto),
                handler: async (ctx, input) => {
                    const { count, totalSales } = await this.reports.getSalesSummary(ctx.tenantId, { from: input.from, to: input.to, partyId: input.partyId });
                    return { count, totalSales };
                },
            }),
            defineAiTool({
                name: 'reports.purchase-summary',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: `Total purchases and invoice count for a period, optionally for one supplier. ${PERIOD_HINT}`,
                input: dtoInput(AiPartyDateRangeDto),
                handler: async (ctx, input) => {
                    const { count, totalPurchases } = await this.reports.getPurchaseSummary(ctx.tenantId, { from: input.from, to: input.to, partyId: input.partyId });
                    return { count, totalPurchases };
                },
            }),
            defineAiTool({
                name: 'reports.profit-summary',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: `Sales, purchases, expenses, gross and net profit for a period. ${PERIOD_HINT}`,
                input: dtoInput(AiDateRangeDto),
                handler: (ctx, input) => this.reports.getProfitSummary(ctx.tenantId, { from: input.from, to: input.to }),
            }),
            defineAiTool({
                name: 'reports.party-statement',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: 'What a customer/supplier was invoiced, has paid and still owes (posted documents).',
                input: dtoInput(AiPartyStatementDto),
                handler: async (ctx, input) => {
                    const statement = await this.reports.getPartyStatement(ctx.tenantId, input.partyId);
                    if (!statement.party) throw new NotFoundException('Party not found');
                    return {
                        party: { id: statement.party.id, name: statement.party.name, code: statement.party.code },
                        totalInvoiced: statement.totalInvoiced,
                        totalPaid: statement.totalPaid,
                        balance: statement.balance,
                        invoiceCount: statement.invoices.length,
                        paymentCount: statement.payments.length,
                    };
                },
            }),
            defineAiTool({
                name: 'reports.dashboard-summary',
                domain: 'reports',
                resource: resources.dashboard.key,
                risk: 'read',
                permission: 'dashboard.view',
                description: `Business KPIs for a period: sales, purchases, expenses, net profit, cashbox balances, low-stock and active counts. ${PERIOD_HINT}`,
                input: dtoInput(AiDateRangeDto),
                handler: (ctx, input) => this.reports.getDashboardSummary(ctx.tenantId, { from: input.from, to: input.to }),
            }),
            defineAiTool({
                name: 'reports.top-items',
                domain: 'reports',
                resource: resources.dashboard.key,
                risk: 'read',
                permission: 'dashboard.view',
                description: `Best-selling items by sales value for a period (default: this month). ${PERIOD_HINT}`,
                input: dtoInput(AiTopItemsDto),
                handler: (ctx, input) => this.reports.getDashboardTopItems(ctx.tenantId, { from: input.from, to: input.to, limit: input.limit }),
            }),
        ];
    }
}
