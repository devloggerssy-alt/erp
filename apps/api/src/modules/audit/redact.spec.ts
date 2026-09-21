import { redact, REDACTED } from './redact';

describe('redact', () => {
    it('redacts sensitive keys at any depth, case- and separator-insensitive', () => {
        expect(
            redact({
                email: 'a@b.c',
                password: 'p',
                passwordHash: 'h',
                user: { accessToken: 't', refresh_token: 'r', profile: { apiKey: 'k', otp: '1234' } },
                headers: { Authorization: 'Bearer x', cookie: 'c' },
                clientSecret: 's',
            }),
        ).toEqual({
            email: 'a@b.c',
            password: REDACTED,
            passwordHash: REDACTED,
            user: { accessToken: REDACTED, refresh_token: REDACTED, profile: { apiKey: REDACTED, otp: REDACTED } },
            headers: { Authorization: REDACTED, cookie: REDACTED },
            clientSecret: REDACTED,
        });
    });

    it('does not over-redact keys that merely contain a sensitive substring', () => {
        expect(redact({ notPosted: true, tokenCount: 3, passportNumber: 'X1' })).toEqual({
            notPosted: true,
            tokenCount: 3,
            passportNumber: 'X1',
        });
    });

    it('walks arrays, serializes dates and Decimal-like values, hides binaries', () => {
        const decimalLike = { toJSON: () => '12.5000' };
        expect(
            redact({
                lines: [{ token: 'x', amount: decimalLike }],
                at: new Date('2026-01-01T00:00:00.000Z'),
                file: Buffer.from('abc'),
            }),
        ).toEqual({ lines: [{ token: REDACTED, amount: '12.5000' }], at: '2026-01-01T00:00:00.000Z', file: '[BINARY]' });
    });

    it('treats class instances (validated DTOs) like plain objects', () => {
        class CreateUserDto {
            email = 'a@b.c';
            password = 'secret';
        }
        expect(redact(new CreateUserDto())).toEqual({ email: 'a@b.c', password: REDACTED });
    });

    it('caps oversized payloads', () => {
        expect(redact({ blob: 'x'.repeat(40_000) })).toEqual({ truncated: true, originalSize: expect.any(Number) });
    });
});
