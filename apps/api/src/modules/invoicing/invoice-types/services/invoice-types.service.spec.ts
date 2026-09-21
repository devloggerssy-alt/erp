import { InvoiceTypesService } from './invoice-types.service';
import { DEFAULT_INVOICE_TYPES } from '../default-invoice-types';

function buildDeps() {
    const repository = { findMany: jest.fn(), createMany: jest.fn() } as any;
    const presenter = { toResponse: jest.fn(), toResponseList: jest.fn() } as any;
    const emitter = { emit: jest.fn() } as any;

    const service = new InvoiceTypesService(repository, presenter, emitter);
    return { service, repository };
}

describe('InvoiceTypesService.createDefaults', () => {
    it('creates the standard invoice types when the tenant has none', async () => {
        const { service, repository } = buildDeps();
        repository.findMany.mockResolvedValue({ data: [], total: 0 });
        repository.createMany.mockResolvedValue(DEFAULT_INVOICE_TYPES.length);

        const created = await service.createDefaults('tenant-1');

        expect(created).toBe(DEFAULT_INVOICE_TYPES.length);
        expect(repository.findMany).toHaveBeenCalledWith('tenant-1', { take: 1 });
        expect(repository.createMany).toHaveBeenCalledWith(
            DEFAULT_INVOICE_TYPES.map((type) => ({ tenantId: 'tenant-1', ...type })),
        );
    });

    it('is idempotent when the tenant already has invoice types', async () => {
        const { service, repository } = buildDeps();
        repository.findMany.mockResolvedValue({ data: [{ id: 'type-1' }], total: 1 });

        expect(await service.createDefaults('tenant-1')).toBe(0);
        expect(repository.createMany).not.toHaveBeenCalled();
    });
});
