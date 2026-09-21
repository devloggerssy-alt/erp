import { NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { DisabledDomainFilter } from './disabled-domain.filter';

function hostFor(path: string): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
        switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ path }) }),
    } as unknown as ArgumentsHost;
    return { host, json, status };
}

describe('DisabledDomainFilter', () => {
    const original = process.env.DISABLED_DOMAINS;

    afterEach(() => {
        if (original === undefined) delete process.env.DISABLED_DOMAINS;
        else process.env.DISABLED_DOMAINS = original;
    });

    it('rewrites router 404s for disabled domains in the shared envelope', () => {
        process.env.DISABLED_DOMAINS = 'files';
        const { host, json, status } = hostFor('/files/1');
        new DisabledDomainFilter().catch(new NotFoundException('Cannot GET /files/1'), host);

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith({
            status: 'error',
            message: 'The "files" module is disabled in this deployment.',
            data: null,
            error: {
                code: 'NOT_FOUND',
                message: 'The "files" module is disabled in this deployment.',
            },
        });
    });

    it('keeps the default message for all other 404s, wrapped in the envelope', () => {
        delete process.env.DISABLED_DOMAINS;
        const { host, json } = hostFor('/units/missing');
        new DisabledDomainFilter().catch(new NotFoundException('Unit not found'), host);
        expect(json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Unit not found',
            data: null,
            error: { code: 'NOT_FOUND', message: 'Unit not found' },
        });
    });
});
