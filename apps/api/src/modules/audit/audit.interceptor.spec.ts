import type { CallHandler } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { RequestContext } from '../../common/request-context/request-context';

class PaymentsController {}
Reflect.defineMetadata(PATH_METADATA, 'payments', PaymentsController);

function context(req: Record<string, unknown>, handlerName: string) {
    const handler = { [handlerName]: function () {} }[handlerName];
    return {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => handler,
        getClass: () => PaymentsController,
    } as never;
}

function build() {
    const writer = { record: jest.fn().mockResolvedValue(undefined) };
    return { interceptor: new AuditInterceptor(writer as never, new Reflector()), writer };
}

const user = { id: 'u1', tenantId: 't1', email: 'a@b.c' };
const ok = (body: unknown): CallHandler => ({ handle: () => of(body) });

describe('AuditInterceptor', () => {
    it('audits a successful create with the id from the response envelope', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'POST', user, params: {}, body: { amount: 10 }, route: { path: '/payments' }, originalUrl: '/payments' };
        await lastValueFrom(interceptor.intercept(context(req, 'create'), ok({ status: 'success', data: { id: 'pay-1' } })));
        expect(writer.record).toHaveBeenCalledWith({
            tenantId: 't1',
            userId: 'u1',
            action: 'CREATE',
            entityType: 'payments',
            entityId: 'pay-1',
            newValues: { amount: 10 },
            source: 'HTTP',
            metadata: { method: 'POST', route: '/payments', handler: 'PaymentsController.create' },
        });
    });

    it('uses the :id param and the handler name for workflow actions', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'POST', user, params: { id: 'pay-9' }, body: {}, route: { path: '/payments/:id/post' } };
        await lastValueFrom(interceptor.intercept(context(req, 'post'), ok({ data: { id: 'other' } })));
        expect(writer.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'POST', entityId: 'pay-9' }));
    });

    it('converts camelCase handler names to UPPER_SNAKE and falls back to n/a', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'DELETE', user, params: {}, body: { ids: ['a'] }, originalUrl: '/payments/bulk' };
        await lastValueFrom(interceptor.intercept(context(req, 'bulkDelete'), ok(undefined)));
        expect(writer.record).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'BULK_DELETE', entityId: 'n/a', metadata: expect.objectContaining({ route: '/payments/bulk' }) }),
        );
    });

    it('skips GET requests', async () => {
        const { interceptor, writer } = build();
        await lastValueFrom(interceptor.intercept(context({ method: 'GET', user, params: {} }, 'list'), ok([])));
        expect(writer.record).not.toHaveBeenCalled();
    });

    it('skips unauthenticated mutations (login)', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'POST', params: {}, body: { password: 'x' } };
        await lastValueFrom(interceptor.intercept(context(req, 'login'), ok({})));
        expect(writer.record).not.toHaveBeenCalled();
    });

    it('does not audit a failed request', async () => {
        const { interceptor, writer } = build();
        const failing: CallHandler = { handle: () => throwError(() => new Error('boom')) };
        const req = { method: 'POST', user, params: {}, body: {} };
        await expect(lastValueFrom(interceptor.intercept(context(req, 'create'), failing))).rejects.toThrow('boom');
        expect(writer.record).not.toHaveBeenCalled();
    });

    it('publishes the actor into the request context, for GETs too', async () => {
        const { interceptor } = build();
        await RequestContext.run({ source: 'HTTP' }, async () => {
            await lastValueFrom(interceptor.intercept(context({ method: 'GET', user, params: {} }, 'list'), ok([])));
            expect(RequestContext.get()).toMatchObject({ userId: 'u1', tenantId: 't1' });
        });
    });

    it('ignores non-http contexts', async () => {
        const { interceptor, writer } = build();
        const rpc = { getType: () => 'rpc' } as never;
        await lastValueFrom(interceptor.intercept(rpc, ok('x')));
        expect(writer.record).not.toHaveBeenCalled();
    });
});
