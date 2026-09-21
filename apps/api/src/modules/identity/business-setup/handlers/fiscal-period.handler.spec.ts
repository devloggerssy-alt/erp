import { BadRequestException, ConflictException } from '@nestjs/common';
import { FiscalPeriodTaskHandler } from './fiscal-period.handler';

describe('FiscalPeriodTaskHandler', () => {
    it('validates the payload and creates the fiscal period', async () => {
        const fiscalPeriodsService = { create: jest.fn().mockResolvedValue({ id: 'fp-1' }) };
        const handler = new FiscalPeriodTaskHandler(fiscalPeriodsService as never);

        const result = await handler.execute('t1', 'u1', { name: 'FY 2026', startDate: '2026-01-01', endDate: '2026-12-31' });

        expect(fiscalPeriodsService.create).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'FY 2026' }));
        expect(result).toEqual({ completed: true, details: { fiscalPeriodId: 'fp-1' } });
    });

    it('treats an overlapping-period ConflictException as already-satisfied (idempotent)', async () => {
        const fiscalPeriodsService = { create: jest.fn().mockRejectedValue(new ConflictException('overlap')) };
        const handler = new FiscalPeriodTaskHandler(fiscalPeriodsService as never);
        const result = await handler.execute('t1', 'u1', { name: 'FY 2026', startDate: '2026-01-01', endDate: '2026-12-31' });
        expect(result).toEqual({ completed: true, details: { fiscalPeriodId: null } });
    });

    it('rejects an invalid payload before calling the service', async () => {
        const fiscalPeriodsService = { create: jest.fn() };
        const handler = new FiscalPeriodTaskHandler(fiscalPeriodsService as never);
        await expect(handler.execute('t1', 'u1', { name: 'FY 2026' })).rejects.toThrow(BadRequestException);
        expect(fiscalPeriodsService.create).not.toHaveBeenCalled();
    });
});
