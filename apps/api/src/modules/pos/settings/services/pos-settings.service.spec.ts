import { BadRequestException } from '@nestjs/common';
import { PosSettingsService } from './pos-settings.service';

function deps() {
    const repo = {
        findByTenantId: jest.fn(),
        upsert: jest.fn(),
        findActiveBranch: jest.fn(),
        findActiveCashbox: jest.fn(),
        findFirstActiveCashbox: jest.fn(),
        findActiveWarehouse: jest.fn(),
        findFirstActiveWarehouseForBranch: jest.fn(),
        warehouseIsLinkedToBranch: jest.fn(),
    } as any;
    const partiesService = { list: jest.fn(), create: jest.fn() } as any;
    const invoiceTypesService = { list: jest.fn(), create: jest.fn() } as any;

    const service = new PosSettingsService(repo, partiesService, invoiceTypesService);
    return { service, repo, partiesService, invoiceTypesService };
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
        const { service, repo, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [], total: 0 });
        partiesService.create.mockResolvedValue({ id: 'party-walkin' });
        invoiceTypesService.list.mockResolvedValue({ data: [], total: 0 });
        invoiceTypesService.create.mockResolvedValue({ id: 'itype-pos' });
        repo.findFirstActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: 'b1' });
        repo.findActiveBranch.mockResolvedValue({ id: 'b1' });
        repo.findFirstActiveWarehouseForBranch.mockResolvedValue({ id: 'wh-1' });
        repo.upsert.mockResolvedValue({ id: 'setting-1' });

        const result = await service.provision('t1');

        expect(partiesService.create).toHaveBeenCalledWith('t1', expect.objectContaining({ code: 'WALKIN' }));
        expect(invoiceTypesService.create).toHaveBeenCalledWith('t1', expect.objectContaining({ code: 'POS', direction: 'SALE' }));
        expect(repo.findFirstActiveWarehouseForBranch).toHaveBeenCalledWith('t1', 'b1');
        expect(repo.upsert).toHaveBeenCalledWith('t1', {
            defaultPartyId: 'party-walkin', invoiceTypeId: 'itype-pos', cashboxId: 'cbx-1', warehouseId: 'wh-1', branchId: 'b1',
        });
        expect(result).toEqual({ id: 'setting-1' });
    });

    it('reuses an existing WALKIN party and POS invoice type instead of duplicating them', async () => {
        const { service, repo, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [{ id: 'party-existing' }], total: 1 });
        invoiceTypesService.list.mockResolvedValue({ data: [{ id: 'itype-existing' }], total: 1 });
        repo.findFirstActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: 'b1' });
        repo.findActiveBranch.mockResolvedValue({ id: 'b1' });
        repo.findFirstActiveWarehouseForBranch.mockResolvedValue({ id: 'wh-1' });
        repo.upsert.mockResolvedValue({ id: 'setting-1' });

        await service.provision('t1');

        expect(partiesService.create).not.toHaveBeenCalled();
        expect(invoiceTypesService.create).not.toHaveBeenCalled();
        expect(repo.upsert).toHaveBeenCalledWith('t1', {
            defaultPartyId: 'party-existing', invoiceTypeId: 'itype-existing', cashboxId: 'cbx-1', warehouseId: 'wh-1', branchId: 'b1',
        });
    });

    it('rejects provisioning when there is no active cashbox', async () => {
        const { service, repo, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [{ id: 'party-existing' }], total: 1 });
        invoiceTypesService.list.mockResolvedValue({ data: [{ id: 'itype-existing' }], total: 1 });
        repo.findFirstActiveCashbox.mockResolvedValue(null);

        await expect(service.provision('t1')).rejects.toThrow(BadRequestException);
    });

    it('rejects provisioning when the till cashbox has no branch', async () => {
        const { service, repo, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [{ id: 'party-existing' }], total: 1 });
        invoiceTypesService.list.mockResolvedValue({ data: [{ id: 'itype-existing' }], total: 1 });
        repo.findFirstActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: null });

        await expect(service.provision('t1')).rejects.toThrow(/branch/);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('rejects provisioning when no active warehouse is linked to the till branch', async () => {
        const { service, repo, partiesService, invoiceTypesService } = deps();
        repo.findByTenantId.mockResolvedValue(null);
        partiesService.list.mockResolvedValue({ data: [{ id: 'party-existing' }], total: 1 });
        invoiceTypesService.list.mockResolvedValue({ data: [{ id: 'itype-existing' }], total: 1 });
        repo.findFirstActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: 'b1' });
        repo.findActiveBranch.mockResolvedValue({ id: 'b1' });
        repo.findFirstActiveWarehouseForBranch.mockResolvedValue(null);

        await expect(service.provision('t1')).rejects.toThrow(/warehouse linked to the till branch/);
        expect(repo.upsert).not.toHaveBeenCalled();
    });
});

describe('PosSettingsService.update', () => {
    const existing = {
        id: 'setting-1',
        defaultPartyId: 'p',
        invoiceTypeId: 'it',
        cashboxId: 'cbx-1',
        warehouseId: 'wh-1',
        branchId: 'b1',
    };

    function consistentMocks(repo: any) {
        repo.findActiveBranch.mockResolvedValue({ id: 'b1' });
        repo.findActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: 'b1' });
        repo.findActiveWarehouse.mockResolvedValue({ id: 'wh-1' });
        repo.warehouseIsLinkedToBranch.mockResolvedValue(true);
    }

    it('rejects updating before provisioning', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue(null);

        await expect(service.update('t1', { cashboxId: 'cbx-2' })).rejects.toThrow(BadRequestException);
    });

    it('rejects settings with no branch assigned', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue({ ...existing, branchId: null });

        await expect(service.update('t1', {})).rejects.toThrow(/must have a branch/);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('rejects an inactive or foreign cashbox', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue(existing);
        consistentMocks(repo);
        repo.findActiveCashbox.mockResolvedValue(null);

        await expect(service.update('t1', { cashboxId: 'cbx-2' })).rejects.toThrow(BadRequestException);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('refuses a branch inconsistent with the cashbox', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue(existing);
        consistentMocks(repo);
        repo.findActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: 'b2' });

        await expect(service.update('t1', { branchId: 'b1' })).rejects.toThrow(/cashbox does not belong/);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('refuses a warehouse not linked to the branch', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue(existing);
        consistentMocks(repo);
        repo.warehouseIsLinkedToBranch.mockResolvedValue(false);

        await expect(service.update('t1', {})).rejects.toThrow(/warehouse is not linked/);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('saves a branch that matches the cashbox and warehouse', async () => {
        const { service, repo } = deps();
        repo.findByTenantId.mockResolvedValue(existing);
        consistentMocks(repo);
        repo.upsert.mockResolvedValue({ id: 'setting-1' });

        await service.update('t1', { branchId: 'b1' });

        expect(repo.findActiveBranch).toHaveBeenCalledWith('t1', 'b1');
        expect(repo.warehouseIsLinkedToBranch).toHaveBeenCalledWith('t1', 'b1', 'wh-1');
        expect(repo.upsert).toHaveBeenCalledWith('t1', {
            defaultPartyId: 'p', invoiceTypeId: 'it', cashboxId: 'cbx-1', warehouseId: 'wh-1', branchId: 'b1',
        });
    });
});
