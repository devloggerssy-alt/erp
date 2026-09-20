import { NotFoundException, type ExecutionContext } from '@nestjs/common';
import { DomainAvailabilityGuard } from './domain-availability.guard';

function contextFor(path: string): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ path }) }),
    } as unknown as ExecutionContext;
}

describe('DomainAvailabilityGuard', () => {
    const original = process.env.DISABLED_DOMAINS;

    afterEach(() => {
        if (original === undefined) delete process.env.DISABLED_DOMAINS;
        else process.env.DISABLED_DOMAINS = original;
    });

    it('lets everything through when nothing is disabled', () => {
        delete process.env.DISABLED_DOMAINS;
        expect(new DomainAvailabilityGuard().canActivate(contextFor('/files/1'))).toBe(true);
    });

    it('404s a disabled domain with a clear message', () => {
        process.env.DISABLED_DOMAINS = 'files';
        const guard = new DomainAvailabilityGuard();
        expect(() => guard.canActivate(contextFor('/files/1'))).toThrow(NotFoundException);
        expect(() => guard.canActivate(contextFor('/files/1'))).toThrow(
            'The "files" module is disabled in this deployment.',
        );
    });

    it('does not touch enabled domains or untracked paths', () => {
        process.env.DISABLED_DOMAINS = 'files';
        const guard = new DomainAvailabilityGuard();
        expect(guard.canActivate(contextFor('/units'))).toBe(true);
        expect(guard.canActivate(contextFor('/docs'))).toBe(true);
    });
});
