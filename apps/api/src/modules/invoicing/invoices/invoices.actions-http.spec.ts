import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { InvoicePresenter } from './presenters/invoice.presenter';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';

const invoice = { id: 'i1', number: 'INV-1', status: 'POSTED' };

describe('invoice action routes return the documented 200 payload', () => {
    let app: INestApplication;
    const invoicesService = {
        findById: jest.fn().mockResolvedValue({ invoiceType: { direction: 'SALE' } }),
        addPayment: jest.fn().mockResolvedValue(invoice),
    };
    const postingService = {
        postSalesInvoice: jest.fn().mockResolvedValue(invoice),
        postPurchaseInvoice: jest.fn(),
        cancelInvoice: jest.fn().mockResolvedValue({ ...invoice, status: 'CANCELLED' }),
    };
    const presenter = {
        toDetailResponse: jest.fn((entity: unknown) => entity),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            controllers: [InvoicesController],
            providers: [
                { provide: InvoicesService, useValue: invoicesService },
                { provide: InvoicePostingService, useValue: postingService },
                { provide: InvoicePresenter, useValue: presenter },
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

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('POST /invoices/:id/post returns 200 with the invoice payload', async () => {
        const res = await request(app.getHttpServer()).post('/invoices/i1/post').expect(200);

        expect(res.body).toEqual({
            status: 'success',
            message: 'Invoice posted successfully',
            data: invoice,
        });
        expect(postingService.postSalesInvoice).toHaveBeenCalledWith('t1', 'i1', 'u1');
    });

    it('POST /invoices/:id/cancel returns 200 with the invoice payload', async () => {
        const res = await request(app.getHttpServer()).post('/invoices/i1/cancel').expect(200);

        expect(res.body.data).toEqual(expect.objectContaining({ id: 'i1', status: 'CANCELLED' }));
        expect(postingService.cancelInvoice).toHaveBeenCalledWith('t1', 'i1', 'u1');
    });

    it('POST /invoices/:id/payments returns 200 with the invoice payload', async () => {
        const res = await request(app.getHttpServer())
            .post('/invoices/i1/payments')
            .send({ cashboxId: 'cbx-1', amount: 25, date: '2026-10-15' })
            .expect(200);

        expect(res.body.data).toEqual(invoice);
        expect(invoicesService.addPayment).toHaveBeenCalledWith('t1', 'u1', 'i1', {
            cashboxId: 'cbx-1',
            amount: 25,
            date: '2026-10-15',
        });
    });
});
