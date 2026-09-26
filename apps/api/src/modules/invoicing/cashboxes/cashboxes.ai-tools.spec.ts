import { CashboxesAiTools } from './cashboxes.ai-tools';

describe('CashboxesAiTools', () => {
    const tools = new CashboxesAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in invoicing', () => {
        expect(tools.map((t) => t.name)).toEqual(['cashboxes.list', 'cashboxes.show', 'cashboxes.create', 'cashboxes.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['invoicing']));
        expect(tools.map((t) => t.permission)).toEqual(['cashboxes.view', 'cashboxes.view', 'cashboxes.create', 'cashboxes.update']);
    });

    it('offers no balance field', () => {
        const create = tools.find((t) => t.name === 'cashboxes.create');
        expect(Object.keys(create?.jsonSchema.properties ?? {})).not.toContain('balance');
    });
});
