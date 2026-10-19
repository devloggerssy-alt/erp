import { ExecutionContext, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { BranchesController } from './controllers/branches.controller';
import { BranchesService } from './services/branches.service';

/**
 * Phase 1.1 (#30) — exercises the real controller and the real branch delete
 * guard over HTTP; only the repository and the auth guard are doubles. Pins the
 * external contract: referenced branches answer 409, unreferenced ones 204, and
 * a branch that is not in the caller's tenant is not addressable (404).
 */
describe('DELETE /branches — delete guard', () => {
    let app: INestApplication;
    const repository = {
        findByIdOrFail: jest.fn(),
        countReferences: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        repository.findByIdOrFail.mockReset();
        repository.countReferences.mockReset();
        repository.delete.mockReset().mockResolvedValue({});

        const service = new BranchesService(
            repository as never,
            { toResponse: (entity: unknown) => entity } as never,
            { next: jest.fn() } as never,
            { emit: jest.fn() } as never,
        );

        const moduleRef = await Test.createTestingModule({
            controllers: [BranchesController],
            providers: [{ provide: BranchesService, useValue: service }],
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

    it('returns 409 and deletes nothing when a warehouse, cashbox or document refers to the branch', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'b1', tenantId: 't1' });
        repository.countReferences.mockResolvedValue({ warehouses: 1, cashboxes: 1, documents: 1, invoices: 0, journalEntries: 0, payments: 0, expenses: 0, bankAccounts: 0 });

        await request(app.getHttpServer()).delete('/branches/b1').expect(409);

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced branch with 204', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'b1', tenantId: 't1' });
        repository.countReferences.mockResolvedValue({ warehouses: 0, cashboxes: 0, documents: 0, invoices: 0, journalEntries: 0, payments: 0, expenses: 0, bankAccounts: 0 });

        await request(app.getHttpServer()).delete('/branches/b1').expect(204);

        expect(repository.delete).toHaveBeenCalledWith('b1');
    });

    it('returns 404 for a branch outside the caller tenant', async () => {
        repository.findByIdOrFail.mockRejectedValue(new NotFoundException('Branch with id "b9" not found'));

        await request(app.getHttpServer()).delete('/branches/b9').expect(404);

        expect(repository.delete).not.toHaveBeenCalled();
    });
});
