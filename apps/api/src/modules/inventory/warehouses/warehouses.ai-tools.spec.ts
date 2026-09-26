import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { WarehousesAiTools } from './warehouses.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

describe('WarehousesAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const tools = new WarehousesAiTools(service as never).aiTools();

    it('exposes list/show/create/update (no delete) in the inventory domain', () => {
        expect(tools.map((t) => t.name)).toEqual(['warehouses.list', 'warehouses.show', 'warehouses.create', 'warehouses.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['inventory']));
        expect(toolNamed(tools, 'warehouses.create').permission).toBe('warehouses.create');
    });

    it('searches the localized name through the filter schema', async () => {
        service.list.mockResolvedValue({ data: [], total: 0 });
        const prepared = await toolNamed(tools, 'warehouses.list').prepare({ search: 'main' });
        if (!prepared.ok) throw new Error('invalid');
        await prepared.run(ctx);
        expect(service.list).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ where: expect.any(Object), take: 20 }));
    });
});
