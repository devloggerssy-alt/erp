import { Logger } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ResourceCreatedEvent, ResourceDeletedEvent, ResourceUpdatedEvent } from '@devloggers/backend-core';
import { CrudEventsListener } from './crud-events.listener';

describe('CrudEventsListener (Phase 8.4.5)', () => {
    it('consumes CRUD events emitted through EventEmitter2', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true })],
            providers: [CrudEventsListener],
        }).compile();
        await moduleRef.init();

        const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        const emitter = moduleRef.get(EventEmitter2);

        emitter.emit('units.created', new ResourceCreatedEvent('t1', 'units', { id: 'u1' }));
        expect(debug).toHaveBeenCalledWith(
            expect.objectContaining({
                msg: 'crud event',
                action: 'created',
                resource: 'units',
                tenantId: 't1',
                entityId: 'u1',
            }),
        );

        emitter.emit('units.updated', new ResourceUpdatedEvent('t1', 'units', { id: 'u1' }, { id: 'u1' }));
        expect(debug).toHaveBeenCalledWith(expect.objectContaining({ action: 'updated', resource: 'units' }));

        emitter.emit('units.deleted', new ResourceDeletedEvent('t1', 'units', { id: 'u1' }));
        expect(debug).toHaveBeenCalledWith(expect.objectContaining({ action: 'deleted', resource: 'units' }));

        debug.mockRestore();
        await moduleRef.close();
    });
});
