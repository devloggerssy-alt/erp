import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { TagsAiTools } from './tags.ai-tools';

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

describe('TagsAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const tools = new TagsAiTools(service as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('exposes list/show/create/update/delete in the catalog domain', () => {
        expect(tools.map((t) => t.name)).toEqual(['tags.list', 'tags.show', 'tags.create', 'tags.update', 'tags.delete']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['catalog']));
        expect(toolNamed(tools, 'tags.list').permission).toBe('tags.view');
    });

    it('marks delete destructive behind tags.delete', () => {
        expect(toolNamed(tools, 'tags.delete')).toMatchObject({ risk: 'destructive', permission: 'tags.delete' });
    });

    it('deletes through the service with the context tenant', async () => {
        service.findById.mockResolvedValue({ id: ID });
        service.delete.mockResolvedValue(undefined);
        await expect(run(toolNamed(tools, 'tags.delete'), { id: ID })).resolves.toEqual({ id: ID, deleted: true });
        expect(service.delete).toHaveBeenCalledWith('tenant-1', ID);
    });
});
