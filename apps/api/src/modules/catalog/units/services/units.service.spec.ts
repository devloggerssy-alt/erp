import { UnitsService } from './units.service';
import { DEFAULT_UNITS } from '../default-units';

function buildDeps() {
    const repository = { findMany: jest.fn(), createMany: jest.fn() } as any;
    const presenter = { toResponse: jest.fn(), toResponseList: jest.fn() } as any;
    const emitter = { emit: jest.fn() } as any;

    const service = new UnitsService(repository, presenter, emitter);
    return { service, repository };
}

describe('UnitsService.createDefaults', () => {
    it('creates the standard units when the tenant has none', async () => {
        const { service, repository } = buildDeps();
        repository.findMany.mockResolvedValue({ data: [], total: 0 });
        repository.createMany.mockResolvedValue(DEFAULT_UNITS.length);

        const created = await service.createDefaults('tenant-1');

        expect(created).toBe(DEFAULT_UNITS.length);
        expect(repository.findMany).toHaveBeenCalledWith('tenant-1', { take: 1 });
        expect(repository.createMany).toHaveBeenCalledWith(
            DEFAULT_UNITS.map((unit) => ({ tenantId: 'tenant-1', ...unit })),
        );
    });

    it('is idempotent when the tenant already has units', async () => {
        const { service, repository } = buildDeps();
        repository.findMany.mockResolvedValue({ data: [{ id: 'unit-1' }], total: 1 });

        expect(await service.createDefaults('tenant-1')).toBe(0);
        expect(repository.createMany).not.toHaveBeenCalled();
    });
});
