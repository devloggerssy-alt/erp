import { NotFoundException } from '@nestjs/common';
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { ReportsAiTools } from './reports.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('ReportsAiTools', () => {
    const service = {
        getSalesSummary: jest.fn(),
        getPurchaseSummary: jest.fn(),
        getProfitSummary: jest.fn(),
        getPartyStatement: jest.fn(),
        getDashboardSummary: jest.fn(),
        getDashboardTopItems: jest.fn(),
    };
    const tools = new ReportsAiTools(service as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('has six read tools in the reports domain with the HTTP permissions', () => {
        expect(tools.map((t) => [t.name, t.permission])).toEqual([
            ['reports.sales-summary', 'reports.view'],
            ['reports.purchase-summary', 'reports.view'],
            ['reports.profit-summary', 'reports.view'],
            ['reports.party-statement', 'reports.view'],
            ['reports.dashboard-summary', 'dashboard.view'],
            ['reports.top-items', 'dashboard.view'],
        ]);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'reports', risk: 'read' });
    });

    it('returns sales aggregates without the invoice rows', async () => {
        service.getSalesSummary.mockResolvedValue({ invoices: [{ id: 'x' }], totalSales: 120, count: 1 });
        await expect(run(toolNamed(tools, 'reports.sales-summary'), { from: '2026-09-01', to: '2026-09-30' })).resolves.toEqual({ count: 1, totalSales: 120 });
        expect(service.getSalesSummary).toHaveBeenCalledWith('tenant-1', { from: '2026-09-01', to: '2026-09-30', partyId: undefined });
    });

    it('returns purchase aggregates without the invoice rows', async () => {
        service.getPurchaseSummary.mockResolvedValue({ invoices: [], totalPurchases: 80, count: 3 });
        await expect(run(toolNamed(tools, 'reports.purchase-summary'), {})).resolves.toEqual({ count: 3, totalPurchases: 80 });
    });

    it('rejects a non-ISO date', async () => {
        await expect(toolNamed(tools, 'reports.sales-summary').prepare({ from: 'last month' })).resolves.toMatchObject({ ok: false });
    });

    it('summarises a party statement and 404s an unknown party', async () => {
        service.getPartyStatement.mockResolvedValue({
            party: { id: ID, name: 'Acme', code: 'C1', phone: 'x' },
            invoices: [{}, {}], payments: [{}], totalInvoiced: 300, totalPaid: 100, balance: 200,
        });
        await expect(run(toolNamed(tools, 'reports.party-statement'), { partyId: ID })).resolves.toEqual({
            party: { id: ID, name: 'Acme', code: 'C1' }, totalInvoiced: 300, totalPaid: 100, balance: 200, invoiceCount: 2, paymentCount: 1,
        });
        service.getPartyStatement.mockResolvedValue({ party: null, invoices: [], payments: [], totalInvoiced: 0, totalPaid: 0, balance: 0 });
        await expect(run(toolNamed(tools, 'reports.party-statement'), { partyId: ID })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('caps top-items at 20', async () => {
        await expect(toolNamed(tools, 'reports.top-items').prepare({ limit: 21 })).resolves.toMatchObject({ ok: false });
        service.getDashboardTopItems.mockResolvedValue([]);
        await run(toolNamed(tools, 'reports.top-items'), { limit: 5 });
        expect(service.getDashboardTopItems).toHaveBeenCalledWith('tenant-1', { from: undefined, to: undefined, limit: 5 });
    });
});
