import { Logger } from '@nestjs/common';
import { LoggingOutboxHandler } from './logging-outbox.handler';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OUTBOX_TOPICS } from './outbox.types';

describe('LoggingOutboxHandler', () => {
    it('registers itself for both posting topics and logs deliveries', async () => {
        const registry = new OutboxHandlerRegistry();
        const handler = new LoggingOutboxHandler(registry);
        const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

        handler.onModuleInit();

        const posted = registry.resolve(OUTBOX_TOPICS.journalPosted);
        expect(posted).toBeDefined();
        await posted?.(
            { journalEntryId: 'je-1', number: 'JE-000001', intentKind: 'PAYMENT_RECORDED' },
            {
                eventId: 'ob-1',
                tenantId: 't1',
                topic: OUTBOX_TOPICS.journalPosted,
                attempt: 1,
            },
        );

        expect(debug).toHaveBeenCalledWith(
            expect.objectContaining({ msg: 'outbox event delivered', journalEntryId: 'je-1', number: 'JE-000001' }),
        );
        expect(registry.resolve(OUTBOX_TOPICS.journalReversed)).toBeDefined();
        debug.mockRestore();
    });
});
