import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { AiTool, AiToolContext, AiToolResult } from '@devloggers/backend-core';
import { AuditWriter } from '../../audit';

const TOOL_TIMEOUT_MS = 30_000;
const OUTPUT_CAP_CHARS = 8_000;

class ToolTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ToolTimeoutError(`Tool timed out after ${ms} ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function capOutput(output: unknown): unknown {
    const serialized = JSON.stringify(output ?? null);
    if (serialized.length <= OUTPUT_CAP_CHARS) return output ?? null;
    return { truncated: true, preview: serialized.slice(0, OUTPUT_CAP_CHARS) };
}

function entityIdOf(output: unknown, fallback: string): string {
    if (output !== null && typeof output === 'object' && 'id' in output) {
        const id = (output as { id: unknown }).id;
        if (typeof id === 'string') return id;
    }
    return fallback;
}

@Injectable()
export class AiToolExecutor {
    private readonly logger = new Logger(AiToolExecutor.name);

    constructor(private readonly audit: AuditWriter) {}

    async execute(ctx: AiToolContext, tool: AiTool, rawInput: unknown, toolCallId: string): Promise<AiToolResult> {
        // Defence in depth: the registry already filtered by permission.
        if (!ctx.permissions.has(tool.permission)) {
            return { kind: 'error', errorText: `Missing permission: ${tool.permission}` };
        }
        const prepared = await tool.prepare(rawInput);
        
        if (!prepared.ok) {
            return { kind: 'error', errorText: 'Invalid tool input', details: prepared.errors };
        }
        try {
            const output = await withTimeout(prepared.run(ctx), TOOL_TIMEOUT_MS);
            if (tool.risk !== 'read') {
                await this.audit.record({
                    tenantId: ctx.tenantId,
                    userId: ctx.userId,
                    action: `ai.${tool.name}`,
                    entityType: tool.resource ?? tool.domain,
                    entityId: entityIdOf(output, toolCallId),
                    newValues: rawInput,
                    source: 'AI_AGENT',
                    metadata: { conversationId: ctx.conversationId, toolCallId, tool: tool.name },
                });
            }
            return { kind: 'output', output: capOutput(output) };
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() < 500) {
                // Business-rule messages (ConflictException, validation) go back to the model so it can self-correct.
                return { kind: 'error', errorText: error.message, details: error.getResponse() };
            }
            this.logger.error({
                msg: 'AI tool failed',
                tool: tool.name,
                conversationId: ctx.conversationId,
                toolCallId,
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                kind: 'error',
                errorText: error instanceof ToolTimeoutError ? error.message : 'The action failed due to a server error.',
            };
        }
    }
}
