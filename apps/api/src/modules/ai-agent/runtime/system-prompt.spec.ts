import { buildSystemPrompt } from './system-prompt';

describe('buildSystemPrompt', () => {
    const prompt = buildSystemPrompt(
        { tenantId: 't', userId: 'u', permissions: new Set<string>(), locale: 'en', conversationId: 'c' },
        new Date('2026-09-26T10:00:00Z'),
    );

    it('tells the model how to resolve ids and relative dates', () => {
        expect(prompt).toContain('Today is 2026-09-26.');
        expect(prompt).toMatch(/customers\.list or suppliers\.list/);
        expect(prompt).toMatch(/YYYY-MM-DD/);
    });

    it('names the domains that need tools.load', () => {
        expect(prompt).toMatch(/invoicing.*inventory.*accounting/s);
    });
});
