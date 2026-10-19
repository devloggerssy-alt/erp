import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { validationExceptionFactory } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { SalesCheckoutFacade } from '@/modules/invoicing/checkout/sales-checkout.facade';
import { PosSettingsController } from './settings/controllers/pos-settings.controller';
import { PosSettingsService } from './settings/services/pos-settings.service';
import { PosSettingPresenter } from './settings/presenters/pos-setting.presenter';
import { PosCheckoutController } from './checkout/controllers/pos-checkout.controller';
import { PosCheckoutService } from './checkout/services/pos-checkout.service';

/**
 * Phase 1.1 (#34) — the point of sale sells on behalf of the branch configured
 * for the terminal: the settings save refuses a branch inconsistent with the
 * cashbox or warehouse, and a completed checkout stamps that branch on the
 * invoice, the receipt and the journal entry it posts.
 */
describe('pos — branch attribution over HTTP', () => {
    let app: NestExpressApplication;

    const setting = {
        id: 'setting-1',
        tenantId: 't1',
        defaultPartyId: 'party-walkin',
        invoiceTypeId: 'itype-1',
        cashboxId: 'cbx-1',
        warehouseId: 'wh-1',
        branchId: 'b1',
    };

    let tx: {
        invoice: { create: jest.Mock };
        payment: { create: jest.Mock };
    };
    let prisma: {
        branch: { findFirst: jest.Mock };
        cashbox: { findFirst: jest.Mock };
        warehouse: { findFirst: jest.Mock };
        branchWarehouse: { findFirst: jest.Mock };
        invoice: { findUnique: jest.Mock };
        invoiceType: { findFirst: jest.Mock };
        currency: { findFirst: jest.Mock };
        fiscalPeriod: { findFirst: jest.Mock };
        $transaction: jest.Mock;
    };
    let settingsRepository: {
        findByTenantId: jest.Mock;
        upsert: jest.Mock;
        findActiveBranch: jest.Mock;
        findActiveCashbox: jest.Mock;
        findFirstActiveCashbox: jest.Mock;
        findActiveWarehouse: jest.Mock;
        findFirstActiveWarehouseForBranch: jest.Mock;
        warehouseIsLinkedToBranch: jest.Mock;
    };
    let documentSequences: { getNextNumberInTx: jest.Mock };
    let invoicePosting: { postSalesInvoiceInTx: jest.Mock };
    let payments: { postInTx: jest.Mock; allocateInTx: jest.Mock };

    beforeEach(async () => {
        const now = new Date('2026-10-19T10:00:00.000Z');
        tx = {
            invoice: {
                create: jest.fn().mockResolvedValue({
                    id: 'inv-1', number: 'SAL-00001', tenantId: 't1', date: now,
                    warehouseId: 'wh-1', branchId: 'b1', partyId: 'party-walkin',
                    fiscalPeriodId: 'fp-1', currencyId: 'cur-1',
                    invoiceType: { affectsStock: false }, lines: [],
                    fiscalPeriod: { status: 'OPEN' },
                }),
            },
            payment: {
                create: jest.fn().mockResolvedValue({
                    id: 'pay-1', number: 'REC-00001', date: now, fiscalPeriodId: 'fp-1',
                    partyId: 'party-walkin', branchId: 'b1', fiscalPeriod: { status: 'OPEN' },
                }),
            },
        };
        prisma = {
            branch: { findFirst: jest.fn().mockResolvedValue({ id: 'b1' }) },
            cashbox: { findFirst: jest.fn().mockResolvedValue({ id: 'cbx-1', branchId: 'b1' }) },
            warehouse: { findFirst: jest.fn().mockResolvedValue({ id: 'wh-1' }) },
            branchWarehouse: { findFirst: jest.fn().mockResolvedValue({ id: 'link-1' }) },
            invoice: { findUnique: jest.fn().mockResolvedValue(null) },
            invoiceType: { findFirst: jest.fn().mockResolvedValue({ id: 'itype-1', direction: 'SALE' }) },
            currency: { findFirst: jest.fn().mockResolvedValue({ id: 'cur-1', isBase: true }) },
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: 'fp-1', status: 'OPEN' }) },
            $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
        };
        settingsRepository = {
            findByTenantId: jest.fn().mockResolvedValue(setting),
            upsert: jest.fn().mockResolvedValue(setting),
            findActiveBranch: jest.fn().mockResolvedValue({ id: 'b1' }),
            findActiveCashbox: jest.fn().mockResolvedValue({ id: 'cbx-1', branchId: 'b1' }),
            findFirstActiveCashbox: jest.fn().mockResolvedValue({ id: 'cbx-1', branchId: 'b1' }),
            findActiveWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            findFirstActiveWarehouseForBranch: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            warehouseIsLinkedToBranch: jest.fn().mockResolvedValue(true),
        };
        documentSequences = {
            getNextNumberInTx: jest.fn()
                .mockResolvedValueOnce('SAL-00001')
                .mockResolvedValueOnce('REC-00001'),
        };
        invoicePosting = {
            postSalesInvoiceInTx: jest.fn().mockResolvedValue({ id: 'inv-1', number: 'SAL-00001', date: now }),
        };
        payments = {
            postInTx: jest.fn().mockResolvedValue(undefined),
            allocateInTx: jest.fn().mockResolvedValue({ id: 'alloc-1' }),
        };

        const settingsService = new PosSettingsService(
            settingsRepository as never,
            {} as never,
            {} as never,
        );
        const checkoutFacade = new SalesCheckoutFacade(
            prisma as never,
            documentSequences as never,
            invoicePosting as never,
            payments as never,
        );

        const moduleRef = await Test.createTestingModule({
            controllers: [PosSettingsController, PosCheckoutController],
            providers: [
                { provide: PosSettingsService, useValue: settingsService },
                {
                    provide: PosSettingPresenter,
                    useValue: { toResponse: (entity: unknown) => entity },
                },
                {
                    provide: PosCheckoutService,
                    useValue: new PosCheckoutService(settingsService, checkoutFacade),
                },
            ],
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

        app = moduleRef.createNestApplication<NestExpressApplication>();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: { enableImplicitConversion: true },
                exceptionFactory: validationExceptionFactory,
            }),
        );
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('PATCH /pos/settings refuses a branch that does not match the till cashbox', async () => {
        settingsRepository.findActiveCashbox.mockResolvedValue({ id: 'cbx-1', branchId: 'b2' });

        await request(app.getHttpServer())
            .patch('/pos/settings')
            .send({ branchId: 'b1' })
            .expect(400);

        expect(settingsRepository.upsert).not.toHaveBeenCalled();
    });

    it('PATCH /pos/settings refuses a warehouse not linked to the branch', async () => {
        settingsRepository.warehouseIsLinkedToBranch.mockResolvedValue(false);

        await request(app.getHttpServer())
            .patch('/pos/settings')
            .send({ branchId: 'b1' })
            .expect(400);

        expect(settingsRepository.upsert).not.toHaveBeenCalled();
    });

    it('PATCH /pos/settings refuses settings left without a branch', async () => {
        settingsRepository.findByTenantId.mockResolvedValue({ ...setting, branchId: null });

        await request(app.getHttpServer())
            .patch('/pos/settings')
            .send({ warehouseId: 'wh-1' })
            .expect(400);

        expect(settingsRepository.upsert).not.toHaveBeenCalled();
    });

    it('PATCH /pos/settings records a consistent branch', async () => {
        await request(app.getHttpServer())
            .patch('/pos/settings')
            .send({ branchId: 'b1' })
            .expect(200);

        expect(settingsRepository.upsert).toHaveBeenCalledWith('t1', expect.objectContaining({
            branchId: 'b1',
            cashboxId: 'cbx-1',
            warehouseId: 'wh-1',
        }));
    });

    it('POST /pos/checkout records the configured branch on the completed sale', async () => {
        await request(app.getHttpServer())
            .post('/pos/checkout')
            .send({
                lines: [{ itemId: 'item-1', unitId: 'unit-1', quantity: 2, unitPrice: 100 }],
                tendered: 200,
                clientRequestId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            })
            .expect(201);

        expect(tx.invoice.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ branchId: 'b1' }) }),
        );
        expect(invoicePosting.postSalesInvoiceInTx).toHaveBeenCalledWith(
            tx,
            't1',
            expect.objectContaining({ id: 'inv-1', branchId: 'b1' }),
            'u1',
        );
        expect(tx.payment.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ branchId: 'b1' }) }),
        );
        expect(payments.postInTx).toHaveBeenCalledWith(
            tx,
            'pay-1',
            'cbx-1',
            200,
            'u1',
            expect.objectContaining({ branchId: 'b1' }),
        );
    });

    it('POST /pos/checkout refuses a terminal whose settings have no branch', async () => {
        settingsRepository.findByTenantId.mockResolvedValue({ ...setting, branchId: null });

        await request(app.getHttpServer())
            .post('/pos/checkout')
            .send({
                lines: [{ itemId: 'item-1', unitId: 'unit-1', quantity: 1, unitPrice: 100 }],
                tendered: 100,
                clientRequestId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
            })
            .expect(400);

        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});
