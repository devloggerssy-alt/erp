import type { AiTool } from '@devloggers/backend-core';
import { CurrenciesAiTools } from './currencies.ai-tools';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

describe('CurrenciesAiTools', () => {
    const tools = new CurrenciesAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in accounting', () => {
        expect(tools.map((t) => t.name)).toEqual(['currencies.list', 'currencies.show', 'currencies.create', 'currencies.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['accounting']));
    });

    it('never lets the model change the base currency', async () => {
        for (const name of ['currencies.create', 'currencies.update']) {
            expect(Object.keys(toolNamed(tools, name).jsonSchema.properties ?? {})).not.toContain('isBase');
        }
        const create = await toolNamed(tools, 'currencies.create').prepare({ code: 'EUR', name: { ar: 'يورو' }, isBase: true });
        expect(create).toMatchObject({ ok: false, errors: { isBase: expect.any(Array) } });
    });
});
