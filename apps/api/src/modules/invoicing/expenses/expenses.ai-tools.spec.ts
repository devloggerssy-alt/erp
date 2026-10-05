import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { ExpensesAiTools } from './expenses.ai-tools';

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

describe('ExpensesAiTools', () => {
    const service = { findAll: jest.fn(), findById: jest.fn() };
    const tools = new ExpensesAiTools(service as never).aiTools();

    it('has only read tools behind expenses.view', () => {
        expect(tools.map((t) => t.name)).toEqual(['expenses.list', 'expenses.show']);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'invoicing', risk: 'read', permission: 'expenses.view' });
    });

    it('lists compact rows', async () => {
        service.findAll.mockResolvedValue({
            data: [{
                id: ID, number: 'EXP-1', date: new Date('2026-09-02T00:00:00.000Z'), status: 'POSTED', totalAmount: '25.5000',
                notes: 'Taxi', cashbox: { code: 'CB1', name: { ar: 'الصندوق' } }, currency: { code: 'USD', symbol: { ar: '$' } },
            }],
            total: 1, page: 1, limit: 20,
        });
        await expect(run(toolNamed(tools, 'expenses.list'), {})).resolves.toEqual({
            items: [{ id: ID, number: 'EXP-1', date: '2026-09-02T00:00:00.000Z', status: 'POSTED', cashboxCode: 'CB1', currency: 'USD', total: 25.5, notes: 'Taxi' }],
            total: 1,
            page: 1,
        });
        expect(service.findAll).toHaveBeenCalledWith('tenant-1', { status: undefined, page: 1, limit: 20 });
    });
});
