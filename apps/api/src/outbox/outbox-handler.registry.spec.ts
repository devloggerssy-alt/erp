import { OutboxHandlerRegistry } from './outbox-handler.registry';
import type { OutboxEventHandler } from './outbox.types';

describe('OutboxHandlerRegistry', () => {
    it('registers and resolves a handler by topic', () => {
        const registry = new OutboxHandlerRegistry();
        const handler: OutboxEventHandler = () => Promise.resolve();

        registry.register('accounting.journal-posted', handler);

        expect(registry.resolve('accounting.journal-posted')).toBe(handler);
        expect(registry.resolve('unknown.topic')).toBeUndefined();
    });
});
