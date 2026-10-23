import type { AiToolContext } from '@devloggers/backend-core';
import { MetaToolsProvider } from './meta-tools.provider';
import type { AiToolRegistry } from './ai-tool-registry';

describe('MetaToolsProvider', () => {
    const registry = {
        catalog: jest.fn(),
        availableDomains: jest.fn(),
    };
    const tools = new MetaToolsProvider(registry as unknown as AiToolRegistry).aiTools();
    const ctx: AiToolContext = {
        tenantId: 't',
        userId: 'u',
        permissions: new Set(['ai.use']),
        locale: 'en',
        conversationId: 'c',
    };

    function toolNamed(name: string) {
        const tool = tools.find((candidate) => candidate.name === name);
        if (!tool) throw new Error(`missing ${name}`);
        return tool;
    }

    beforeEach(() => jest.clearAllMocks());

    it('exposes only deterministic catalog and load tools', () => {
        expect(tools.map((tool) => tool.name)).toEqual(['tools.catalog', 'tools.load']);
        for (const tool of tools) {
            expect(tool).toMatchObject({ domain: 'ai-agent', permission: 'ai.use', risk: 'read' });
        }
        expect(toolNamed('tools.catalog').jsonSchema.required ?? []).not.toContain('domain');
        expect(toolNamed('tools.load').jsonSchema.required).toContain('domain');
    });

    it('delegates an omitted catalog domain to the registry', async () => {
        registry.catalog.mockResolvedValue({ domains: [] });
        const prepared = await toolNamed('tools.catalog').prepare({});
        if (!prepared.ok) throw new Error('invalid input');
        await expect(prepared.run(ctx)).resolves.toEqual({ domains: [] });
        expect(registry.catalog).toHaveBeenCalledWith(ctx, undefined);
    });

    it('delegates one catalog domain to the registry', async () => {
        registry.catalog.mockResolvedValue({ domain: 'invoicing', tools: [] });
        const prepared = await toolNamed('tools.catalog').prepare({ domain: 'invoicing' });
        if (!prepared.ok) throw new Error('invalid input');
        await expect(prepared.run(ctx)).resolves.toEqual({ domain: 'invoicing', tools: [] });
        expect(registry.catalog).toHaveBeenCalledWith(ctx, 'invoicing');
    });

    it('loads an available domain', async () => {
        registry.availableDomains.mockReturnValue(['invoicing']);
        const prepared = await toolNamed('tools.load').prepare({ domain: 'invoicing' });
        if (!prepared.ok) throw new Error('invalid input');
        await expect(prepared.run(ctx)).resolves.toEqual({ loadedDomain: 'invoicing' });
    });

    it('names the available domains for an unknown load', async () => {
        registry.availableDomains.mockReturnValue(['invoicing', 'inventory']);
        const prepared = await toolNamed('tools.load').prepare({ domain: 'invoices' });
        if (!prepared.ok) throw new Error('invalid input');
        await expect(prepared.run(ctx)).resolves.toEqual({
            error: 'Unknown or unavailable domain "invoices". Available domains: invoicing, inventory',
        });
    });
});
