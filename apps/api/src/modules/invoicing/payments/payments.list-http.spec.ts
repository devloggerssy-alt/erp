import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { validationExceptionFactory } from '@devloggers/backend-core';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';

/**
 * Pins the payments list query contract: bracket-notation `filters[field][$op]`
 * is the only supported filter syntax (see ApiQueryOptionsDto), and flat params
 * like `?status=POSTED` are rejected by the global whitelist pipe instead of
 * being silently ignored.
 */
describe('GET /payments — list filters', () => {
    let app: INestApplication;
    const service = {
        list: jest.fn().mockResolvedValue({ data: [], total: 0 }),
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

        app = moduleRef.createNestApplication<NestExpressApplication>();
        app.set('query parser', 'extended');
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

    it('forwards filters[status][$eq] to the service as a Prisma where clause', async () => {
        await request(app.getHttpServer())
            .get('/payments?filters[status][$eq]=POSTED&page=1&limit=10')
            .expect(200);

        expect(service.list).toHaveBeenCalledWith(
            't1',
            expect.objectContaining({
                skip: 0,
                take: 10,
                where: { status: { equals: 'POSTED' } },
                orderBy: { createdAt: 'desc' },
            }),
        );
    });

    it('returns the filterable fields in the list meta', async () => {
        const res = await request(app.getHttpServer())
            .get('/payments?filters[status][$eq]=POSTED')
            .expect(200);

        expect(res.body.meta.filterOptions).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'status' })]),
        );
    });

    it('rejects flat ?status=POSTED with a whitelist validation error', async () => {
        const res = await request(app.getHttpServer()).get('/payments?status=POSTED').expect(422);

        expect(res.body).toEqual(
            expect.objectContaining({
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({ field: 'status', code: 'whitelistValidation' }),
                ]),
            }),
        );
    });
});
