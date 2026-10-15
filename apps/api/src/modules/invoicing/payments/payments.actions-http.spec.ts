import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';

const payment = { id: 'p1', number: 'PAY-1', status: 'POSTED', amount: 100 };

describe('payment action routes return the documented 200 payload', () => {
    let app: INestApplication;
    const service = {
        post: jest.fn().mockResolvedValue(payment),
        cancel: jest.fn().mockResolvedValue({ ...payment, status: 'CANCELLED' }),
        allocate: jest.fn().mockResolvedValue(undefined),
        removeAllocation: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(payment),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [{ provide: PaymentsService, useValue: service }],
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

    it('POST /payments/:id/post returns 200 with the payment payload', async () => {
        const res = await request(app.getHttpServer()).post('/payments/p1/post').expect(200);

        expect(res.body).toEqual({
            status: 'success',
            message: 'Payment posted',
            data: payment,
        });
    });

    it('POST /payments/:id/cancel returns 200 with the payment payload', async () => {
        const res = await request(app.getHttpServer()).post('/payments/p1/cancel').expect(200);

        expect(res.body.data).toEqual(expect.objectContaining({ id: 'p1', status: 'CANCELLED' }));
    });

    it('POST /payments/:id/allocate returns 200 with the payment payload', async () => {
        const res = await request(app.getHttpServer())
            .post('/payments/p1/allocate')
            .send({ invoiceId: 'inv-1', amount: 40 })
            .expect(200);

        expect(res.body.data).toEqual(payment);
    });

    it('POST /payments/:id/allocations/:allocationId/remove returns 200 with the payment payload', async () => {
        const res = await request(app.getHttpServer())
            .post('/payments/p1/allocations/a1/remove')
            .expect(200);

        expect(res.body.data).toEqual(payment);
    });
});
