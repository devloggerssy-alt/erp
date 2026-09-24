/** OpenAI function names must match ^[a-zA-Z0-9_-]+$; registry names are dotted. */
export function toModelToolName(name: string): string {
    return name.replace(/\./g, '__');
}

export function fromModelToolName(name: string): string {
    return name.replace(/__/g, '.');
}

/** Tools of these domains are always offered; others are pulled in by `tools.load`. */
export const ALWAYS_LOADED_DOMAINS: ReadonlySet<string> = new Set(['ai-agent', 'catalog', 'parties']);

/** Financial documents and ledgers are cancelled or reversed, never deleted (.ai/rules/domain.md). */
export const NEVER_DELETE_RESOURCES: ReadonlySet<string> = new Set([
    'invoices',
    'payments',
    'expenses',
    'accounting',
    'chart-of-accounts',
    'stock-ledger',
    'stock-counts',
]);

export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-zA-Z0-9-]*$/;
