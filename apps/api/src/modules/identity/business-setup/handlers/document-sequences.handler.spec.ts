import { ConflictException } from '@nestjs/common';
import { DocumentSequencesTaskHandler } from './document-sequences.handler';

describe('DocumentSequencesTaskHandler', () => {
    it('creates every sequence and reports the created count', async () => {
        const documentSequencesService = { create: jest.fn().mockResolvedValue({ id: 'seq-1' }) };
        const handler = new DocumentSequencesTaskHandler(documentSequencesService as never);

        const result = await handler.execute('t1', 'u1', [
            { documentType: 'SALES_INVOICE', prefix: 'INV-' },
            { documentType: 'PAYMENT', prefix: 'PAY-' },
        ]);

        expect(documentSequencesService.create).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ completed: true, details: { created: 2 } });
    });

    it('is idempotent — a ConflictException for an already-existing document type does not fail the batch', async () => {
        const documentSequencesService = {
            create: jest.fn()
                .mockRejectedValueOnce(new ConflictException('exists'))
                .mockResolvedValueOnce({ id: 'seq-2' }),
        };
        const handler = new DocumentSequencesTaskHandler(documentSequencesService as never);

        const result = await handler.execute('t1', 'u1', [
            { documentType: 'SALES_INVOICE', prefix: 'INV-' },
            { documentType: 'PAYMENT', prefix: 'PAY-' },
        ]);

        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('propagates non-conflict errors', async () => {
        const documentSequencesService = { create: jest.fn().mockRejectedValue(new Error('db down')) };
        const handler = new DocumentSequencesTaskHandler(documentSequencesService as never);
        await expect(handler.execute('t1', 'u1', [{ documentType: 'SALES_INVOICE', prefix: 'INV-' }])).rejects.toThrow('db down');
    });
});
