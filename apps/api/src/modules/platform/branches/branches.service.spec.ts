import { BadRequestException, ConflictException } from '@nestjs/common';
import { BranchesService } from './services/branches.service';

function build(overrides: Record<string, unknown> = {}) {
        const repository = {
                isCodeTaken: jest.fn().mockResolvedValue(false),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn().mockResolvedValue({}),
                findMany: jest.fn().mockResolvedValue({ data: [], total: 0 }),
                findByIdWithWarehouses: jest.fn(),
                countOwnedBranches: jest.fn().mockResolvedValue(0),
                countOwnedWarehouses: jest.fn().mockResolvedValue(0),
                listWarehouseIdsForBranch: jest.fn().mockResolvedValue([]),
                countOtherBranchesForWarehouse: jest.fn().mockResolvedValue(1),
                replaceBranchWarehouses: jest.fn().mockResolvedValue(undefined),
                countReferences: jest.fn().mockResolvedValue({ warehouses: 0, cashboxes: 0, documents: 0, invoices: 0, journalEntries: 0, payments: 0, expenses: 0, bankAccounts: 0, posSettings: 0 }),
                getTenantDefaults: jest.fn().mockResolvedValue(null),
                getDefaultBranchId: jest.fn().mockResolvedValue(null),
                ...overrides,
        };
        const presenter = {
                toResponse: jest.fn((entity: unknown) => entity),
                toResponseList: jest.fn((entities: unknown[]) => entities),
        };
        const codeSequences = { next: jest.fn().mockResolvedValue('BR-0001') };
        const emitter = { emit: jest.fn() };

        const service = new BranchesService(
                repository as never,
                presenter as never,
                codeSequences as never,
                emitter as never,
        );
        return { service, repository, presenter, codeSequences, emitter };
}

describe('BranchesService — code minting', () => {
        it('mints a branch code through the code-sequence allocator when blank', async () => {
                const { service, repository, codeSequences } = build();
                repository.create.mockResolvedValue({ id: 'b1', tenantId: 't1', code: 'BR-0001' });
                repository.findByIdWithWarehouses.mockResolvedValue({ id: 'b1', tenantId: 't1', code: 'BR-0001' });

                await service.create('t1', { name: { ar: 'الفرع' } } as never);

                expect(codeSequences.next).toHaveBeenCalledWith('t1', 'branch', expect.any(Function));
                expect(repository.create).toHaveBeenCalledWith(
                        expect.objectContaining({ tenantId: 't1', code: 'BR-0001' }),
                );
        });

        it('refuses a duplicate manual code', async () => {
                const { service, repository } = build({
                        isCodeTaken: jest.fn().mockResolvedValue(true),
                });

                await expect(
                        service.create('t1', { code: 'MAIN', name: { ar: 'الفرع' } } as never),
                ).rejects.toThrow(ConflictException);
                expect(repository.create).not.toHaveBeenCalled();
        });
});

describe('BranchesService — warehouse links', () => {
        it('refuses branch ids that do not belong to the tenant', async () => {
                const { service, repository } = build({
                        countOwnedWarehouses: jest.fn().mockResolvedValue(1),
                });

                await expect(
                        service.create('t1', { name: { ar: 'الفرع' }, warehouseIds: ['w1', 'w2'] } as never),
                ).rejects.toThrow(BadRequestException);
                expect(repository.create).not.toHaveBeenCalled();
        });

        it('links the given warehouses when the branch is created', async () => {
                const { service, repository } = build({
                        countOwnedWarehouses: jest.fn().mockResolvedValue(1),
                });
                repository.create.mockResolvedValue({ id: 'b1', tenantId: 't1', code: 'BR-0001' });
                repository.findByIdWithWarehouses.mockResolvedValue({ id: 'b1', tenantId: 't1', code: 'BR-0001' });

                await service.create('t1', { name: { ar: 'الفرع' }, warehouseIds: ['w1'] } as never);

                expect(repository.replaceBranchWarehouses).toHaveBeenCalledWith('t1', 'b1', ['w1']);
        });

        it('refuses removing a warehouse\'s last branch', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
                        countOwnedWarehouses: jest.fn().mockResolvedValue(1),
                        listWarehouseIdsForBranch: jest.fn().mockResolvedValue(['w1', 'w2']),
                        countOtherBranchesForWarehouse: jest.fn().mockResolvedValue(0),
                });

                await expect(
                        service.update('t1', 'b1', { warehouseIds: ['w2'] } as never),
                ).rejects.toThrow(ConflictException);
                expect(repository.update).not.toHaveBeenCalled();
        });
});

describe('BranchesService.delete — references', () => {
        it('refuses deleting a branch a warehouse, cashbox or document refers to', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
                        countReferences: jest.fn().mockResolvedValue({ warehouses: 1, cashboxes: 0, documents: 0, invoices: 0, journalEntries: 0, payments: 0, expenses: 0, bankAccounts: 0, posSettings: 0 }),
                });

                await expect(service.delete('t1', 'b1')).rejects.toThrow(ConflictException);
                expect(repository.delete).not.toHaveBeenCalled();
        });

        it('refuses deleting a branch a payment or expense refers to', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
                        countReferences: jest.fn().mockResolvedValue({ warehouses: 0, cashboxes: 0, documents: 0, invoices: 0, journalEntries: 0, payments: 1, expenses: 1, bankAccounts: 0, posSettings: 0 }),
                });

                await expect(service.delete('t1', 'b1')).rejects.toThrow(ConflictException);
                expect(repository.delete).not.toHaveBeenCalled();
        });

        it('refuses deleting the branch a POS terminal sells for', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
                        countReferences: jest.fn().mockResolvedValue({ warehouses: 0, cashboxes: 0, documents: 0, invoices: 0, journalEntries: 0, payments: 0, expenses: 0, bankAccounts: 0, posSettings: 1 }),
                });

                await expect(service.delete('t1', 'b1')).rejects.toThrow(ConflictException);
                expect(repository.delete).not.toHaveBeenCalled();
        });

        it('deletes an unreferenced branch', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
                });

                await service.delete('t1', 'b1');

                expect(repository.delete).toHaveBeenCalledWith('b1');
        });
});

describe('BranchesService.createDefault', () => {
        it('seeds a MAIN branch when the tenant has none', async () => {
                const { service, repository } = build();
                repository.findMany.mockResolvedValue({ data: [], total: 0 });
                repository.getTenantDefaults.mockResolvedValue({ name: 'Acme', address: 'Damascus', phone: null });

                const created = await service.createDefault('t1');

                expect(created).toBe(true);
                expect(repository.create).toHaveBeenCalledWith(
                        expect.objectContaining({ tenantId: 't1', code: 'MAIN', name: { ar: 'Acme' } }),
                );
        });

        it('is a no-op when the tenant already has a branch', async () => {
                const { service, repository } = build();
                repository.findMany.mockResolvedValue({ data: [{ id: 'b1' }], total: 1 });

                const created = await service.createDefault('t1');

                expect(created).toBe(false);
                expect(repository.create).not.toHaveBeenCalled();
        });
});

describe('BranchesService — deactivating the default branch', () => {
        it('refuses deactivating the branch currently set as the tenant default', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1', isActive: true }),
                        getDefaultBranchId: jest.fn().mockResolvedValue('b1'),
                });

                await expect(service.update('t1', 'b1', { isActive: false } as never)).rejects.toThrow(
                        ConflictException,
                );
                expect(repository.update).not.toHaveBeenCalled();
        });

        it('allows deactivating a branch that is not the default', async () => {
                const { service, repository } = build({
                        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1', isActive: true }),
                        getDefaultBranchId: jest.fn().mockResolvedValue('b2'),
                        update: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1', isActive: false }),
                        findByIdWithWarehouses: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1', isActive: false }),
                });

                await service.update('t1', 'b1', { isActive: false } as never);

                expect(repository.update).toHaveBeenCalled();
        });
});
