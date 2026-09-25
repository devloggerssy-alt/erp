import { ServiceUnavailableException } from '@nestjs/common';
import { ChatModelFactory } from './model.factory';

function createConfig(values: Record<string, string | undefined>) {
    return { get: (key: string) => values[key] } as never;
}

describe('ChatModelFactory', () => {
    it('forces reasoning_effort to "none" for reasoning-capable models so tool-calling works', () => {
        const factory = new ChatModelFactory(
            createConfig({ 'ai.provider': 'openai', 'ai.model': 'gpt-6-luna', 'ai.apiKey': 'key' }),
        );

        const model = factory.create();

        expect(model.modelKwargs).toMatchObject({ reasoning_effort: 'none' });
    });

    it('does not set reasoning_effort for a non-reasoning model', () => {
        const factory = new ChatModelFactory(
            createConfig({ 'ai.provider': 'openai', 'ai.model': 'gpt-4o-mini', 'ai.apiKey': 'key' }),
        );

        const model = factory.create();

        expect(model.modelKwargs?.reasoning_effort).toBeUndefined();
    });

    it('throws when AI_MODEL is not configured', () => {
        const factory = new ChatModelFactory(createConfig({ 'ai.provider': 'openai', 'ai.apiKey': 'key' }));

        expect(() => factory.create()).toThrow(ServiceUnavailableException);
    });
});
