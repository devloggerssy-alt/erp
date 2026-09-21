import { UnprocessableEntityException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService.update', () => {
    const service = new SettingsService({} as never, {} as never, {} as never);

    it('reports per-key validation failures as shared field details', async () => {
        await expect(service.update('tenant-1', { defaultTaxRate: 999 })).rejects.toMatchObject({
            response: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid settings',
                details: expect.arrayContaining([
                    expect.objectContaining({ field: 'defaultTaxRate', code: 'settings' }),
                ]),
            },
        });
        await expect(service.update('tenant-1', { defaultTaxRate: 999 })).rejects.toBeInstanceOf(
            UnprocessableEntityException,
        );
    });
});
