import { NotFoundException } from '@nestjs/common';
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { SuppliersAiTools } from './suppliers.ai-tools';

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

describe('SuppliersAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const tools = new SuppliersAiTools(service as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('exposes list/show/create/update only, in the parties domain', () => {
        expect(tools.map((t) => t.name)).toEqual(['suppliers.list', 'suppliers.show', 'suppliers.create', 'suppliers.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['parties']));
    });

    it('hides type and GL account fields from the model', () => {
        const props = Object.keys(toolNamed(tools, 'suppliers.create').jsonSchema.properties ?? {});
        expect(props).not.toContain('type');
        expect(props).not.toContain('receivableAccountId');
        expect(props).not.toContain('payableAccountId');
    });

    it('lists only suppliers', async () => {
        service.list.mockResolvedValue({ data: [], total: 0 });
        await run(toolNamed(tools, 'suppliers.list'), {});
        expect(service.list).toHaveBeenCalledWith(
            'tenant-1',
            expect.objectContaining({ where: expect.objectContaining({ type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } }) }),
        );
    });

    it('treats a pure customer as not found', async () => {
        service.findById.mockResolvedValue({ id: ID, type: 'CUSTOMER' });
        await expect(run(toolNamed(tools, 'suppliers.show'), { id: ID })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates with type SUPPLIER', async () => {
        service.create.mockResolvedValue({ id: ID });
        await run(toolNamed(tools, 'suppliers.create'), { name: 'Acme Trading' });
        expect(service.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ name: 'Acme Trading', type: 'SUPPLIER' }));
    });
});
