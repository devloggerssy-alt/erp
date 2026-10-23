import type { AiToolContext } from '@devloggers/backend-core';

const LANGUAGE_BY_LOCALE: Record<string, string> = { ar: 'Arabic', tr: 'Turkish', en: 'English' };

export function buildSystemPrompt(ctx: AiToolContext, now: Date = new Date(), toolIndex = ''): string {
    const language = LANGUAGE_BY_LOCALE[ctx.locale.split('-')[0] ?? ctx.locale] ?? 'English';
    return [
        'You are the assistant inside an ERP system (catalog, parties, inventory, invoicing, accounting).',
        `Reply in ${language}. Today is ${now.toISOString().slice(0, 10)}.`,
        'Use tools to read and change data. Never invent record IDs, prices or quantities — look them up first.',
        'Tools that change data are confirmed by the user before they run; ask for missing required fields instead of guessing.',
        'If a tool returns an error, explain it plainly and propose the fix. If the user rejected an action, do not retry it unless asked.',
        'Tools that take an id need a real id: find it first (e.g. customers.list or suppliers.list before reports.party-statement).',
        'Turn relative dates such as "this month" into YYYY-MM-DD dates based on today before calling a tool.',
        'The tool index below lists every domain and tool you may use. Domains marked (loaded) are callable now; ' +
            'domains marked (not loaded) are NOT callable until you call tools.load(domain). Call tools.catalog(domain) ' +
            'for descriptions. Never invent a tool name.',
        toolIndex ? `Tool index:\n${toolIndex}` : '',
        'Keep answers short. Use Markdown tables for lists of records.',
    ]
        .filter((line) => line.length > 0)
        .join('\n');
}
