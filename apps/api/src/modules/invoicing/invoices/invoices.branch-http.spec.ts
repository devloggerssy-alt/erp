import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { InvoicePresenter } from './presenters/invoice.presenter';

/**
 * Phase 1.1 (#32) — the invoice branch contract over HTTP: a new invoice is
 * stamped with its branch, an unlinked warehouse is refused, a foreign-tenant
 * branch is not addressable, and the list stays tenant-scoped while filtering
 * by branch.
 */
describe('invoices — branch attribution over HTTP', () => {
    let app: NestExpressApplication;
    const prisma = {
        invoiceType: { findFirst: jest.fn() },
        invoice: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
        branch: { findFirst: jest.fn() },
        branchWarehouse: { findFirst: jest.fn() },
    };
    const documentSequences = { getNextNumber: jest.fn().mockResolvedValue('SINV-00001') };

    const createBody = {
        invoiceTypeId: 'type-1',
        date: '2026-10-19',
        partyId: 'party-1',
        branchId: 'b1',
        warehouseId: 'w1',
        fiscalPeriodId: 'fp-1',
        currencyId: 'cur-1',
        lines: [{ itemId: 'item-1', unitId: 'unit-1', quantity: 1, unitPrice: 1000 }],
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        prisma.invoiceType.findFirst.mockResolvedValue({ id: 'type-1', direction: 'SALE' });
        prisma.branch.findFirst.mockResolvedValue({ id: 'b1' });
        prisma.branchWarehouse.findFirst.mockResolvedValue({ id: 'link-1' });
        prisma.invoice.create.mockResolvedValue({ id: 'inv-1', status: 'DRAFT', branchId: 'b1' });
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv-1',
            number: 'SINV-00001',
            status: 'DRAFT',
            branchId: 'b1',
            paymentAllocations: [],
        });
        prisma.invoice.findMany.mockResolvedValue([]);
        prisma.invoice.count.mockResolvedValue(0);

        const service = new InvoicesService(
            prisma as never,
            documentSequences as never,
            {} as never,
            {} as never,
        );

        const moduleRef = await Test.createTestingModule({
            controllers: [InvoicesController],
            providers: [
                { provide: InvoicesService, useValue: service },
                { provide: InvoicePostingService, useValue: {} },
                {
                    provide: InvoicePresenter,
                    useValue: {
                        toListResponseList: (entities: unknown[]) => entities,
                        toDetailResponse: (entity: unknown) => entity,
                    },
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
        app.set('query parser', 'extended');
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('records the branch on a created invoice', async () => {
        await request(app.getHttpServer()).post('/invoices').send(createBody).expect(201);

        expect(prisma.invoice.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ branchId: 'b1' }) }),
        );
    });

    it('refuses a warehouse that is not linked to the invoice branch', async () => {
        prisma.branchWarehouse.findFirst.mockResolvedValue(null);

        await request(app.getHttpServer()).post('/invoices').send(createBody).expect(400);

        expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('refuses a branch owned by another tenant', async () => {
        prisma.branch.findFirst.mockResolvedValue(null);

        await request(app.getHttpServer()).post('/invoices').send(createBody).expect(404);

        expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('lists tenant-scoped invoices filtered by branch', async () => {
        await request(app.getHttpServer())
            .get('/invoices?filters[branchId][$eq]=b1')
            .expect(200);

        expect(prisma.invoice.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ tenantId: 't1', branchId: 'b1' }),
            }),
        );
    });
});
