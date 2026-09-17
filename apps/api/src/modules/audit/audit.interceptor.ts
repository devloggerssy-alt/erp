import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { RequestUser } from '@devloggers/backend-core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { RequestContext } from '../../common/request-context/request-context';
import { AuditWriter } from './audit-writer.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type AuditableRequest = Request & { user?: RequestUser };

function toAction(handlerName: string): string {
    return handlerName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

function toEntityType(path: string | string[] | undefined): string {
    const first = Array.isArray(path) ? path[0] : path;
    return (first ?? '').replace(/^\/+|\/+$/g, '') || 'unknown';
}

function idFromResponse(response: unknown): string | undefined {
    if (!response || typeof response !== 'object') return undefined;
    const data: unknown = 'data' in response ? (response as { data?: unknown }).data : response;
    if (data && typeof data === 'object' && 'id' in data) {
        const id: unknown = (data as { id?: unknown }).id;
        return typeof id === 'string' ? id : undefined;
    }
    return undefined;
}

/**
 * Phase 7.1.1 — one AuditLog row per successful authenticated mutation.
 * Best-effort (7.1.3): fire-and-forget through AuditWriter.record, which never
 * throws. GL-level events are audited separately and atomically (Tasks 6–7).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly writer: AuditWriter,
        private readonly reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') return next.handle();

        const req = context.switchToHttp().getRequest<AuditableRequest>();
        const user = req.user;
        if (user?.id && user.tenantId) RequestContext.setActor(user.id, user.tenantId);

        if (!MUTATING_METHODS.has(req.method) || !user?.id || !user.tenantId) return next.handle();

        const controller = context.getClass();
        const handler = context.getHandler();
        const entityType = toEntityType(this.reflector.get<string | string[] | undefined>(PATH_METADATA, controller));
        const routePath: unknown = (req.route as { path?: unknown } | undefined)?.path;
        const paramId = req.params?.id;
        const idFromParam = Array.isArray(paramId) ? paramId[0] : paramId;

        return next.handle().pipe(
            tap((response) => {
                void this.writer.record({
                    tenantId: user.tenantId,
                    userId: user.id,
                    action: toAction(handler.name),
                    entityType,
                    entityId: idFromParam ?? idFromResponse(response) ?? 'n/a',
                    newValues: req.body,
                    source: 'HTTP',
                    metadata: {
                        method: req.method,
                        route: typeof routePath === 'string' ? routePath : req.originalUrl,
                        handler: `${controller.name}.${handler.name}`,
                    },
                });
            }),
        );
    }
}
