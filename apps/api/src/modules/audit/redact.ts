export const REDACTED = '[REDACTED]';

/** Matched against the END of the normalized key (lower-case, no `-`/`_`). */
const SENSITIVE_SUFFIXES = [
    'password',
    'passwordhash',
    'token',
    'tokens',
    'secret',
    'apikey',
    'otp',
    'otpcode',
    'authorization',
    'cookie',
];
const MAX_DEPTH = 8;
const MAX_JSON_CHARS = 32_000;

function isSensitive(key: string): boolean {
    const normalized = key.toLowerCase().replace(/[-_]/g, '');
    return SENSITIVE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function walk(value: unknown, depth: number): unknown {
    if (value === null || value === undefined) return value;
    if (depth > MAX_DEPTH) return '[TRUNCATED]';
    if (Buffer.isBuffer(value)) return '[BINARY]';
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));
    if (typeof value === 'object') {
        const withToJson = value as { toJSON?: () => unknown };
        // Prisma Decimal and similar value objects serialize themselves.
        if (typeof withToJson.toJSON === 'function') return withToJson.toJSON();
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            out[key] = isSensitive(key) ? REDACTED : walk(child, depth + 1);
        }
        return out;
    }
    return value;
}

/** Phase 7.1.2 — strip secrets and bound the size of anything written to AuditLog JSON columns. */
export function redact(value: unknown): unknown {
    const cleaned = walk(value, 0);
    const json = JSON.stringify(cleaned);
    if (json !== undefined && json.length > MAX_JSON_CHARS) {
        return { truncated: true, originalSize: json.length };
    }
    return cleaned;
}
