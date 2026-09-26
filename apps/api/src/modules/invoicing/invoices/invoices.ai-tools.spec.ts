import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { InvoicesAiTools } from './invoices.ai-tools';

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

describe('InvoicesAiTools', () => {
    const service = { findAll: jest.fn(), findById: jest.fn() };
    const presenter = { toListResponseList: jest.fn(), toDetailResponse: jest.fn() };
    const tools = new InvoicesAiTools(service as never, presenter as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('has only read tools behind invoices.view', () => {
        expect(tools.map((t) => t.name)).toEqual(['invoices.list', 'invoices.show']);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'invoicing', risk: 'read', permission: 'invoices.view' });
    });

    it('lists compact rows with the context tenant and paging defaults', async () => {
        service.findAll.mockResolvedValue({ data: ['raw'], total: 1, page: 1, limit: 20 });
        presenter.toListResponseList.mockReturnValue([{
            id: ID, number: 'SINV-1', date: '2026-09-01T00:00:00.000Z', invoiceTypeName: 'Sales', invoiceTypeDirection: 'SALE',
            partyName: 'Acme', status: 'POSTED', paidStatus: 'PARTIAL', currencyCode: 'USD', total: 100, amountPaid: 40, balanceDue: 60,
            notes: 'long text that should not be returned',
        }]);
        await expect(run(toolNamed(tools, 'invoices.list'), { status: 'POSTED', direction: 'SALE' })).resolves.toEqual({
            items: [{
                id: ID, number: 'SINV-1', date: '2026-09-01T00:00:00.000Z', type: 'Sales', direction: 'SALE', partyName: 'Acme',
                status: 'POSTED', paidStatus: 'PARTIAL', currency: 'USD', total: 100, amountPaid: 40, balanceDue: 60,
            }],
            total: 1,
            page: 1,
        });
        expect(service.findAll).toHaveBeenCalledWith('tenant-1', { direction: 'SALE', status: 'POSTED', partyId: undefined, page: 1, limit: 20 });
    });

    it('rejects an unknown status and a tenantId in the input', async () => {
        await expect(toolNamed(tools, 'invoices.list').prepare({ status: 'PAID' })).resolves.toMatchObject({ ok: false });
        await expect(toolNamed(tools, 'invoices.list').prepare({ tenantId: 'other' })).resolves.toMatchObject({ ok: false });
    });

    it('shows the full invoice through the presenter', async () => {
        service.findById.mockResolvedValue({ id: ID });
        presenter.toDetailResponse.mockReturnValue({ id: ID, lines: [] });
        await expect(run(toolNamed(tools, 'invoices.show'), { id: ID })).resolves.toEqual({ id: ID, lines: [] });
        expect(service.findById).toHaveBeenCalledWith('tenant-1', ID);
    });
});
