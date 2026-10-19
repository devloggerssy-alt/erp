import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { validationExceptionFactory } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { CashboxesController } from './cashboxes/controllers/cashboxes.controller';
import { CashboxesService } from './cashboxes/services/cashboxes.service';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { ExpensesController } from './expenses/expenses.controller';
import { ExpensesService } from './expenses/expenses.service';

/**
 * Phase 1.1 (#33) — branch attribution over HTTP for cash, expenses and the
 * tills they run through: the branch is required on create, and a cashbox that
 * belongs to a different branch is refused.
 */
describe('cashboxes / payments / expenses — branch attribution', () => {
    let app: NestExpressApplication;

    const prisma = {
        branch: { findFirst: jest.fn() },
        cashbox: { findFirst: jest.fn() },
        payment: { create: jest.fn() },
        expense: { create: jest.fn() },
    };
    const cashboxesRepository = {
        branchExists: jest.fn(),
        isCodeTaken: jest.fn().mockResolvedValue(false),
        create: jest.fn(),
        findMany: jest.fn(),
    };
    const cashboxPresenter = { toResponse: (entity: unknown) => entity };
    const codeSequences = { next: jest.fn().mockResolvedValue('CSH-0001') };
    const paymentsRepository = { findByIdWithDetail: jest.fn(), findManyWithRelations: jest.fn() };
    const paymentPresenter = {
        toResponse: (entity: unknown) => entity,
        toResponseList: (entities: unknown[]) => entities,
    };
    const documentSequences = { getNextNumber: jest.fn().mockResolvedValue('DOC-0001') };

    const cashboxBody = {
        code: 'CASH-1',
        name: { ar: 'صندوق', en: 'Cash' },
        currencyId: 'cur-1',
        branchId: 'b1',
    };
    const paymentBody = {
        type: 'RECEIPT',
        date: '2026-10-19',
        cashboxId: 'cb1',
        branchId: 'b1',
        currencyId: 'cur-1',
        fiscalPeriodId: 'fp-1',
        amount: 100,
    };
    const expenseBody = {
        date: '2026-10-19',
        cashboxId: 'cb1',
        branchId: 'b1',
        currencyId: 'cur-1',
        fiscalPeriodId: 'fp-1',
        items: [{ accountId: 'acc-1', description: 'Rent', amount: 100 }],
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        prisma.branch.findFirst.mockResolvedValue({ id: 'b1' });
        prisma.cashbox.findFirst.mockResolvedValue({ id: 'cb1', branchId: 'b1' });
        prisma.payment.create.mockResolvedValue({ id: 'pay-1', status: 'DRAFT' });
        prisma.expense.create.mockResolvedValue({ id: 'exp-1', status: 'DRAFT' });
        cashboxesRepository.branchExists.mockResolvedValue(true);
        cashboxesRepository.create.mockImplementation((data: Record<string, unknown>) => ({ id: 'cb-1', ...data }));

        const cashboxesService = new CashboxesService(
            cashboxesRepository as never,
            cashboxPresenter as never,
            codeSequences as never,
            { emit: jest.fn() } as never,
        );
        const paymentsService = new PaymentsService(
            paymentsRepository as never,
            paymentPresenter as never,
            documentSequences as never,
            prisma as never,
            {} as never,
        );
        const expensesService = new ExpensesService(
            prisma as never,
            documentSequences as never,
            {} as never,
        );

        const moduleRef = await Test.createTestingModule({
            controllers: [CashboxesController, PaymentsController, ExpensesController],
            providers: [
                { provide: CashboxesService, useValue: cashboxesService },
                { provide: PaymentsService, useValue: paymentsService },
                { provide: ExpensesService, useValue: expensesService },
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

    it('POST /cashboxes requires a branch (422 when omitted)', async () => {
        const { branchId: _omitted, ...withoutBranch } = cashboxBody;

        await request(app.getHttpServer()).post('/cashboxes').send(withoutBranch).expect(422);

        expect(cashboxesRepository.create).not.toHaveBeenCalled();
    });

    it('POST /cashboxes records the branch', async () => {
        await request(app.getHttpServer()).post('/cashboxes').send(cashboxBody).expect(201);

        expect(cashboxesRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ branchId: 'b1' }),
        );
    });

    it('POST /payments refuses a cashbox that belongs to another branch', async () => {
        prisma.cashbox.findFirst.mockResolvedValue({ id: 'cb1', branchId: 'b2' });

        await request(app.getHttpServer()).post('/payments').send(paymentBody).expect(400);

        expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('POST /payments records the branch when the cashbox matches', async () => {
        await request(app.getHttpServer()).post('/payments').send(paymentBody).expect(201);

        expect(prisma.payment.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ branchId: 'b1' }) }),
        );
    });

    it('POST /expenses refuses a cashbox that belongs to another branch', async () => {
        prisma.cashbox.findFirst.mockResolvedValue({ id: 'cb1', branchId: 'b2' });

        await request(app.getHttpServer()).post('/expenses').send(expenseBody).expect(400);

        expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('POST /expenses records the branch when the cashbox matches', async () => {
        await request(app.getHttpServer()).post('/expenses').send(expenseBody).expect(201);

        expect(prisma.expense.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ branchId: 'b1' }) }),
        );
    });
});
