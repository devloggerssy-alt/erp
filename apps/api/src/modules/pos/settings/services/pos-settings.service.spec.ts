import { BadRequestException } from '@nestjs/common';
import { PosSettingsService } from './pos-settings.service';

function deps() {
    const repo = { findByTenantId: jest.fn(), upsert: jest.fn() } as any;
    const prisma = {
        cashbox: { findFirst: jest.fn() },
        warehouse: { findFirst: jest.fn() },
    } as any;
    const partiesService = { list: jest.fn(), create: jest.fn() } as any;
    const invoiceTypesService = { list: jest.fn(), create: jest.fn() } as any;

    const service = new PosSettingsService(repo, prisma, partiesService, invoiceTypesService);
    return { service, repo, prisma, partiesService, invoiceTypesService };
}

describe('PosSettingsService.provision', () => {
    it('is a no-op when already provisioned', async () => {
        const { service, repo, partiesService } = deps();
        repo.findByTenantId.mockResolvedValue({ id: 'setting-1' });

        const result = await service.provision('t1');

        expect(result).toEqual({ id: 'setting-1' });
        expect(partiesService.create).not.toHaveBeenCalled();
    });

    it('creates the walk-in party, POS invoice type, and setting on first run', async () => {
        const { service, repo, prisma, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [], total: 0 });
        partiesService.create.mockResolvedValue({ id: 'party-walkin' });
        invoiceTypesService.list.mockResolvedValue({ data: [], total: 0 });
        invoiceTypesService.create.mockResolvedValue({ id: 'itype-pos' });
        prisma.cashbox.findFirst.mockResolvedValue({ id: 'cbx-1' });
        prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
        repo.upsert.mockResolvedValue({ id: 'setting-1' });

        const result = await service.provision('t1');

        expect(partiesService.create).toHaveBeenCalledWith('t1', expect.objectContaining({ code: 'WALKIN' }));
        expect(invoiceTypesService.create).toHaveBeenCalledWith('t1', expect.objectContaining({ code: 'POS', direction: 'SALE' }));
        expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
            where: { tenantId: 't1', isActive: true },
            orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
        });
        expect(repo.upsert).toHaveBeenCalledWith('t1', {
            defaultPartyId: 'party-walkin', invoiceTypeId: 'itype-pos', cashboxId: 'cbx-1', warehouseId: 'wh-1',
        });
        expect(result).toEqual({ id: 'setting-1' });
    });

    it('reuses an existing WALKIN party and POS invoice type instead of duplicating them', async () => {
        const { service, repo, prisma, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [{ id: 'party-existing' }], total: 1 });
        invoiceTypesService.list.mockResolvedValue({ data: [{ id: 'itype-existing' }], total: 1 });
        prisma.cashbox.findFirst.mockResolvedValue({ id: 'cbx-1' });
        prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
        repo.upsert.mockResolvedValue({ id: 'setting-1' });

        await service.provision('t1');

        expect(partiesService.create).not.toHaveBeenCalled();
        expect(invoiceTypesService.create).not.toHaveBeenCalled();
        expect(repo.upsert).toHaveBeenCalledWith('t1', {
            defaultPartyId: 'party-existing', invoiceTypeId: 'itype-existing', cashboxId: 'cbx-1', warehouseId: 'wh-1',
        });
    });

    it('rejects provisioning when there is no active cashbox', async () => {
        const { service, repo, prisma, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [{ id: 'party-existing' }], total: 1 });
        invoiceTypesService.list.mockResolvedValue({ data: [{ id: 'itype-existing' }], total: 1 });
        prisma.cashbox.findFirst.mockResolvedValue(null);

        await expect(service.provision('t1')).rejects.toThrow(BadRequestException);
    });
});

describe('PosSettingsService.update', () => {
    it('rejects updating before provisioning', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue(null);

        await expect(service.update('t1', { cashboxId: 'cbx-2' })).rejects.toThrow(BadRequestException);
    });

    it('rejects an inactive or foreign cashbox', async () => {
        const { service, repo, prisma } = deps();
        repo.findByTenantId.mockResolvedValue({ id: 'setting-1', defaultPartyId: 'p', invoiceTypeId: 'it', cashboxId: 'cbx-1', warehouseId: 'wh-1' });
        prisma.cashbox.findFirst.mockResolvedValue(null);

        await expect(service.update('t1', { cashboxId: 'cbx-2' })).rejects.toThrow(BadRequestException);
    });
});
