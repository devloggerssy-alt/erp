import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { SettingsController } from './controllers/settings.controller';
import { FormDefaultsController } from './controllers/form-defaults.controller';
import { SettingsService } from './services/settings.service';

const BRANCH_ID = '00000000-0000-4000-ab01-000000000001';

/**
 * Phase 1.1 (#31) — the default branch setting over HTTP: write-time
 * validation (unknown / other-tenant branch refused) and read resolution on
 * the form-defaults endpoint that creation forms consume.
 */
describe('settings endpoints — default branch', () => {
    let app: INestApplication;
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

    beforeEach(async () => {
        jest.clearAllMocks();
        repository.findAll.mockResolvedValue([]);
        repository.upsertMany.mockResolvedValue(undefined);
        prisma.branch.findFirst.mockResolvedValue(null);

        const service = new SettingsService(
            repository as never,
            prisma as never,
            { resolve: (value: { ar?: string; en?: string } | null) => value?.en ?? value?.ar ?? '' } as never,
        );

        const moduleRef = await Test.createTestingModule({
            controllers: [SettingsController, FormDefaultsController],
            providers: [{ provide: SettingsService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (ctx: ExecutionContext) => {
                    ctx.switchToHttp().getRequest<{ user?: unknown }>().user = {
                        id: 'u1',
                        tenantId: 't1',
                        email: 'u1@example.test',
                    };
                    return true;
                },
            })
            .overrideGuard(PermissionsGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('PATCH /settings refuses a branch id that does not exist in the tenant', async () => {
        prisma.branch.findFirst.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
            .patch('/settings')
            .send({ defaultBranchId: BRANCH_ID })
            .expect(422);

        expect(res.body).toEqual(
            expect.objectContaining({
                code: 'VALIDATION_ERROR',
                details: expect.arrayContaining([
                    expect.objectContaining({ field: 'defaultBranchId' }),
                ]),
            }),
        );
        expect(prisma.branch.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ id: BRANCH_ID, tenantId: 't1' }) }),
        );
        expect(repository.upsertMany).not.toHaveBeenCalled();
    });

    it('PATCH /settings persists a branch owned by the tenant', async () => {
        prisma.branch.findFirst.mockResolvedValue({ id: BRANCH_ID });

        await request(app.getHttpServer())
            .patch('/settings')
            .send({ defaultBranchId: BRANCH_ID })
            .expect(200);

        expect(repository.upsertMany).toHaveBeenCalledWith(
            't1',
            [expect.objectContaining({ key: 'defaultBranchId', value: BRANCH_ID, category: 'defaults' })],
        );
    });

    it('GET /settings/defaults resolves the configured default branch', async () => {
        repository.findAll.mockResolvedValue([{ key: 'defaultBranchId', value: BRANCH_ID }]);
        prisma.branch.findFirst.mockResolvedValue({
            id: BRANCH_ID,
            code: 'MAIN',
            name: { ar: 'الفرع الرئيسي', en: 'Main Branch' },
        });

        const res = await request(app.getHttpServer()).get('/settings/defaults').expect(200);

        expect(res.body.data.branch).toEqual({ id: BRANCH_ID, code: 'MAIN', name: 'Main Branch' });
    });

    it('GET /settings/defaults degrades a deleted branch reference to empty without falling back', async () => {
        repository.findAll.mockResolvedValue([{ key: 'defaultBranchId', value: BRANCH_ID }]);
        prisma.branch.findFirst.mockResolvedValue(null);

        const res = await request(app.getHttpServer()).get('/settings/defaults').expect(200);

        expect(res.body.data.branch).toBeNull();
        expect(prisma.branch.findFirst).toHaveBeenCalledTimes(1);
    });
});
