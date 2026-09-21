import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { toErrorResponse } from '@devloggers/backend-core';
import { disabledDomainMessage, resolveDomainForPath, resolveEnabledDomains } from './manifest';

/**
 * Phase 8.2.2 — when a disabled domain is not registered at all, the router
 * answers "Cannot GET ..." before any guard runs. Rewrite that router-level
 * 404 into the same clear message; every other 404 keeps its default message.
 * Both branches emit the shared error envelope.
 */
@Catch(NotFoundException)
export class DisabledDomainFilter implements ExceptionFilter {
    private readonly disabled: ReadonlySet<string>;

    constructor() {
        this.disabled = new Set(resolveEnabledDomains(process.env.DISABLED_DOMAINS).disabled);
    }

    catch(exception: NotFoundException, host: ArgumentsHost): void {
        const http = host.switchToHttp();
        const response = http.getResponse<Response>();
        const request = http.getRequest<Request>();
        const key = resolveDomainForPath(request.path);
        const { status, body } = toErrorResponse(exception);

        if (key && this.disabled.has(key)) {
            const message = disabledDomainMessage(key);
            response.status(status).json({
                ...body,
                message,
                error: { ...body.error, message },
            });
            return;
        }

        response.status(status).json(body);
    }
}
