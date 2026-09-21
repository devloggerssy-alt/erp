import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { disabledDomainMessage, resolveDomainForPath, resolveEnabledDomains } from './manifest';

/**
 * Phase 8.2.2 — when a disabled domain is not registered at all, the router
 * answers "Cannot GET ..." before any guard runs. Rewrite that router-level
 * 404 into the same clear message; every other 404 keeps its default payload.
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
        const payload =
            key && this.disabled.has(key)
                ? { statusCode: exception.getStatus(), message: disabledDomainMessage(key), error: 'Not Found' }
                : exception.getResponse();
        response.status(exception.getStatus()).json(payload);
    }
}
