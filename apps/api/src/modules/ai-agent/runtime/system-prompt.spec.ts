import { buildSystemPrompt } from './system-prompt';

describe('buildSystemPrompt', () => {
    const prompt = buildSystemPrompt(
        { tenantId: 't', userId: 'u', permissions: new Set<string>(), locale: 'en', conversationId: 'c' },
        new Date('2026-09-26T10:00:00Z'),
    );

    it('injects the current date', () => {
        expect(prompt).toContain('Today is 2026-09-26.');
    });

    it('uses the deterministic tool index instead of fuzzy search', () => {
        const withIndex = buildSystemPrompt(
            { tenantId: 't', userId: 'u', permissions: new Set<string>(), locale: 'en', conversationId: 'c' },
            new Date('2026-09-26T10:00:00Z'),
            '- invoicing (not loaded): invoices.list, invoices.show',
        );
        expect(withIndex).toContain('Tool index:');
        expect(withIndex).toContain('invoices.list');
        expect(withIndex).toContain('tools.catalog');
        expect(withIndex).toContain('tools.load');
        expect(withIndex).not.toContain('tools.search');
    });
});
