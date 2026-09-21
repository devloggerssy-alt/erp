import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';

/**
 * Phase 5.3 — a posted payment is cancel-only. Exercises the real controller
 * and the real StatusGuardedCrudService delete path over HTTP; only the
 * repository and the auth guard are doubles.
 */
describe('DELETE /payments — posted payments cannot be deleted', () => {
    let app: INestApplication;
    const repository = { findByIdOrFail: jest.fn(), delete: jest.fn() };

    beforeEach(async () => {
        repository.findByIdOrFail.mockReset();
        repository.delete.mockReset().mockResolvedValue({});
        const service = new PaymentsService(repository as any, {} as any, {} as any, {} as any, {} as any);

        const moduleRef = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [{ provide: PaymentsService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (ctx: ExecutionContext) => {
                    ctx.switchToHttp().getRequest<{ user?: unknown }>().user = { id: 'u1', tenantId: 't1', email: 'u1@example.test' };
                    return true;
                },
            })
            // Permission enforcement is covered by permissions.guard.spec.ts; this
            // suite only exercises the delete-status rules over HTTP.
            .overrideGuard(PermissionsGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('returns 400 and deletes nothing for a POSTED payment', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'POSTED' });

        await request(app.getHttpServer()).delete('/payments/p1').expect(400);

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('returns 400 and deletes nothing for a CANCELLED payment', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'CANCELLED' });

        await request(app.getHttpServer()).delete('/payments/p1').expect(400);

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT payment with 204', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'DRAFT' });

        await request(app.getHttpServer()).delete('/payments/p1').expect(204);

        expect(repository.delete).toHaveBeenCalledWith('p1');
    });

    it('bulk delete reports a POSTED payment as failed and deletes nothing', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'POSTED' });

        const res = await request(app.getHttpServer()).delete('/payments').send({ ids: ['p1'] }).expect(200);

        expect(res.body.data).toEqual(expect.objectContaining({ total: 1, succeeded: 0, failed: 1 }));
        expect(repository.delete).not.toHaveBeenCalled();
    });
});
