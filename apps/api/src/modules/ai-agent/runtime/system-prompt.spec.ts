import { buildSystemPrompt } from './system-prompt';

describe('buildSystemPrompt', () => {
    const prompt = buildSystemPrompt(
        { tenantId: 't', userId: 'u', permissions: new Set<string>(), locale: 'en', conversationId: 'c' },
        new Date('2026-09-26T10:00:00Z'),
    );

    it('injects the current date', () => {
        expect(prompt).toContain('Today is 2026-09-26.');
    });
});
