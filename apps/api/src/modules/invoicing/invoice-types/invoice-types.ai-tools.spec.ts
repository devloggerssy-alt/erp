import type { AiTool } from '@devloggers/backend-core';
import { InvoiceTypesAiTools } from './invoice-types.ai-tools';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

describe('InvoiceTypesAiTools', () => {
    const tools = new InvoiceTypesAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in invoicing', () => {
        expect(tools.map((t) => t.name)).toEqual(['invoice-types.list', 'invoice-types.show', 'invoice-types.create', 'invoice-types.update']);
        expect(toolNamed(tools, 'invoice-types.create').permission).toBe('invoiceTypes.create');
    });

    it('requires an explicit direction on create (no silent PURCHASE default)', async () => {
        const result = await toolNamed(tools, 'invoice-types.create').prepare({ code: 'SRV', name: { ar: 'خدمات' } });
        expect(result).toMatchObject({ ok: false, errors: { direction: expect.any(Array) } });
        const ok = await toolNamed(tools, 'invoice-types.create').prepare({ code: 'SRV', name: { ar: 'خدمات' }, direction: 'SALE' });
        expect(ok).toMatchObject({ ok: true });
    });
});
