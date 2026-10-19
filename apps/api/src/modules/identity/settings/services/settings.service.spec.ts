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

const BRANCH_ID = '00000000-0000-4000-ab01-000000000001';

function build() {
    const repository = {
        findAll: jest.fn().mockResolvedValue([]),
        upsertMany: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
        branch: { findFirst: jest.fn().mockResolvedValue(null) },
        warehouse: { findFirst: jest.fn().mockResolvedValue(null) },
        unit: { findFirst: jest.fn().mockResolvedValue(null) },
        fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
        tenant: { findUnique: jest.fn().mockResolvedValue({ baseCurrencyId: null }) },
        financialSetting: { findUnique: jest.fn().mockResolvedValue(null) },
        currency: { findUnique: jest.fn() },
        cashbox: { findFirst: jest.fn() },
        chartOfAccount: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const locale = { resolve: (value: { ar?: string; en?: string } | null | undefined) => value?.en ?? value?.ar ?? '' };
    const service = new SettingsService(repository as never, prisma as never, locale as never);
    return { service, repository, prisma };
}

describe('SettingsService — default branch reference', () => {
    it('refuses saving a default branch that does not exist in the tenant', async () => {
        const { service, repository, prisma } = build();
        prisma.branch.findFirst.mockResolvedValue(null);

        await expect(service.update('t1', { defaultBranchId: BRANCH_ID })).rejects.toMatchObject({
            response: {
                code: 'VALIDATION_ERROR',
                details: expect.arrayContaining([
                    expect.objectContaining({ field: 'defaultBranchId', code: 'settings' }),
                ]),
            },
        });
        expect(repository.upsertMany).not.toHaveBeenCalled();
    });

    it('accepts and persists a default branch owned by the tenant', async () => {
        const { service, repository, prisma } = build();
        prisma.branch.findFirst.mockResolvedValue({ id: BRANCH_ID });

        await service.update('t1', { defaultBranchId: BRANCH_ID });

        expect(prisma.branch.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ id: BRANCH_ID, tenantId: 't1' }) }),
        );
        expect(repository.upsertMany).toHaveBeenCalledWith(
            't1',
            [expect.objectContaining({ key: 'defaultBranchId', value: BRANCH_ID, category: 'defaults' })],
        );
    });
});

describe('SettingsService.getDefaults — default branch resolution', () => {
    it('resolves the configured default branch to its label', async () => {
        const { service, repository, prisma } = build();
        repository.findAll.mockResolvedValue([{ key: 'defaultBranchId', value: BRANCH_ID }]);
        prisma.branch.findFirst.mockResolvedValue({ id: BRANCH_ID, code: 'MAIN', name: { ar: 'الفرع الرئيسي', en: 'Main Branch' } });

        const defaults = await service.getDefaults('t1');

        expect(defaults.branch).toEqual({ id: BRANCH_ID, code: 'MAIN', name: 'Main Branch' });
        expect(prisma.branch.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: BRANCH_ID, tenantId: 't1', isActive: true }),
            }),
        );
    });

    it('degrades a reference to a deleted branch to empty instead of erroring (no silent fallback)', async () => {
        const { service, repository, prisma } = build();
        repository.findAll.mockResolvedValue([{ key: 'defaultBranchId', value: BRANCH_ID }]);
        // The configured branch was deleted. Even though another active branch
        // could exist, the reference resolves to empty — never to a different branch.
        prisma.branch.findFirst.mockResolvedValue(null);

        const defaults = await service.getDefaults('t1');

        expect(defaults.branch).toBeNull();
        expect(prisma.branch.findFirst).toHaveBeenCalledTimes(1);
    });
});
