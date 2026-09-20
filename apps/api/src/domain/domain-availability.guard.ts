import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { disabledDomainMessage, resolveDomainForPath, resolveEnabledDomains } from './manifest';

/**
 * Phase 8.2.2 — a domain listed in DISABLED_DOMAINS answers 404 with a clear
 * message instead of a DI/500 failure. Registered as APP_GUARD so it runs
 * before controller guards (JwtAuthGuard) and before any handler; this covers
 * domains that are still reachable transitively through an enabled module.
 */
@Injectable()
export class DomainAvailabilityGuard implements CanActivate {
    private readonly disabled: ReadonlySet<string>;

    constructor() {
        this.disabled = new Set(resolveEnabledDomains(process.env.DISABLED_DOMAINS).disabled);
    }

    canActivate(context: ExecutionContext): boolean {
        if (this.disabled.size === 0) return true;

        const request = context.switchToHttp().getRequest<Request>();
        const key = resolveDomainForPath(request.path);
        if (key && this.disabled.has(key)) {
            throw new NotFoundException(disabledDomainMessage(key));
        }
        return true;
    }
}
