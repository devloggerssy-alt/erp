import { BadRequestException } from '@nestjs/common';
import { FinancialSettingsService } from './financial-settings.service';

function makeRepo() {
    return {
        findByTenantId: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'fs-1' }),
    } as any;
}

function makePrisma(accounts: any[]) {
    return {
        chartOfAccount: {
            findMany: jest.fn().mockResolvedValue(accounts),
        },
    } as any;
}

const validAccount = (id: string, type: string) => ({
    id, code: id, type, isPostable: true, isContra: false, deletedAt: null, isActive: true,
});

describe('FinancialSettingsService.upsert — slot validation', () => {
    it('upserts when all provided slots are valid', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([
            validAccount('ar', 'ASSET'),
            validAccount('sales', 'REVENUE'),
        ]);
        const svc = new FinancialSettingsService(repo, prisma);

        await svc.upsert('t1', {
            defaultReceivableAccountId: 'ar',
            defaultSalesAccountId: 'sales',
        } as any);

        expect(repo.upsert).toHaveBeenCalledTimes(1);
    });

    it('rejects when one slot has the wrong type', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([
            validAccount('wrong', 'LIABILITY'), // receivable must be ASSET
        ]);
        const svc = new FinancialSettingsService(repo, prisma);

        await expect(svc.upsert('t1', {
            defaultReceivableAccountId: 'wrong',
        } as any)).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('rejects when one slot references a non-postable account', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([
            { ...validAccount('np', 'ASSET'), isPostable: false },
        ]);
        const svc = new FinancialSettingsService(repo, prisma);

        await expect(svc.upsert('t1', {
            defaultReceivableAccountId: 'np',
        } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when a slot references a soft-deleted account', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([
            { ...validAccount('del', 'ASSET'), deletedAt: new Date() },
        ]);
        const svc = new FinancialSettingsService(repo, prisma);

        await expect(svc.upsert('t1', {
            defaultReceivableAccountId: 'del',
        } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when a slot account does not exist (not configured)', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([]); // findMany returns empty
        const svc = new FinancialSettingsService(repo, prisma);

        await expect(svc.upsert('t1', {
            defaultReceivableAccountId: 'ghost',
        } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('skips validation when no slot ids are provided', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([]);
        const svc = new FinancialSettingsService(repo, prisma);

        await svc.upsert('t1', {} as any);
        expect(prisma.chartOfAccount.findMany).not.toHaveBeenCalled();
        expect(repo.upsert).toHaveBeenCalled();
    });

    it('validates the tax slot expects LIABILITY', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([validAccount('tax', 'ASSET')]); // wrong type
        const svc = new FinancialSettingsService(repo, prisma);

        await expect(svc.upsert('t1', {
            defaultTaxAccountId: 'tax',
        } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('validates the opening-equity slot expects EQUITY', async () => {
        const repo = makeRepo();
        const prisma = makePrisma([validAccount('oe', 'EQUITY')]);
        const svc = new FinancialSettingsService(repo, prisma);

        await svc.upsert('t1', {
            defaultOpeningEquityAccountId: 'oe',
        } as any);
        expect(repo.upsert).toHaveBeenCalled();
    });
});