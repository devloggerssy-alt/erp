import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { PaymentsAiTools } from './payments.ai-tools';

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

describe('PaymentsAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn() };
    const tools = new PaymentsAiTools(service as never).aiTools();

    it('has only read tools behind payments.view', () => {
        expect(tools.map((t) => t.name)).toEqual(['payments.list', 'payments.show']);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'invoicing', risk: 'read', permission: 'payments.view' });
    });

    it('filters, pages and returns compact rows', async () => {
        service.list.mockResolvedValue({
            data: [{
                id: ID, number: 'RCP-1', type: 'RECEIPT', date: '2026-09-03T00:00:00.000Z', status: 'POSTED', partyName: 'Acme',
                cashboxName: 'Main', currencyCode: 'USD', amount: 50, allocatedAmount: 30, unallocatedAmount: 20, allocations: [],
            }],
            total: 1,
        });
        await expect(run(toolNamed(tools, 'payments.list'), { type: 'RECEIPT', partyId: ID, page: 2, limit: 5 })).resolves.toEqual({
            items: [{ id: ID, number: 'RCP-1', type: 'RECEIPT', date: '2026-09-03T00:00:00.000Z', status: 'POSTED', partyName: 'Acme', cashboxName: 'Main', currency: 'USD', amount: 50, allocatedAmount: 30, unallocatedAmount: 20 }],
            total: 1,
            page: 2,
        });
        expect(service.list).toHaveBeenCalledWith('tenant-1', { skip: 5, take: 5, where: { type: 'RECEIPT', partyId: ID }, orderBy: { createdAt: 'desc' } });
    });
});
