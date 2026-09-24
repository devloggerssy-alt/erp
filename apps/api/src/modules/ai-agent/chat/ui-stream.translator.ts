import { randomUUID } from 'node:crypto';
import { AIMessage, AIMessageChunk, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import { INTERRUPT } from '@langchain/langgraph';
import type { UIMessage, UIMessageStreamWriter } from 'ai';
import type { AiToolContext, AiToolResult } from '@devloggers/backend-core';
import type { AiToolRegistry } from '../tools/ai-tool-registry';
import { fromModelToolName } from '../tools/tool-names';
import { AGENT_NODE, TOOLS_NODE } from '../runtime/agent-graph';
import type { ApprovalInterrupt } from '../runtime/agent-state';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

function isAiToolResult(value: unknown): value is AiToolResult {
    return isRecord(value) && (value.kind === 'output' || value.kind === 'error' || value.kind === 'denied');
}

/** Runtime guard for the value the gate node passes to `interrupt()`. */
export function isApprovalInterrupt(value: unknown): value is ApprovalInterrupt {
    return (
        isRecord(value) &&
        Array.isArray(value.calls) &&
        value.calls.every((call) => isRecord(call) && typeof call.toolCallId === 'string')
    );
}

/** Messages a node returned in an `updates` payload (`{ [node]: { messages } }`). */
function messagesOf(update: unknown): BaseMessage[] {
    if (!isRecord(update) || !Array.isArray(update.messages)) return [];
    return update.messages.filter((message): message is BaseMessage => AIMessage.isInstance(message) || ToolMessage.isInstance(message));
}

/** `[mode, payload]` tuple emitted by `graph.stream` with an array `streamMode`. */
function asStreamPart(part: unknown): [string, unknown] | null {
    if (!Array.isArray(part) || part.length !== 2 || typeof part[0] !== 'string') return null;
    return [part[0], part[1]];
}

/**
 * Translates `graph.stream(..., { streamMode: ['messages', 'updates'] })` into
 * AI SDK UI message chunks. Text streams token by token from the agent node;
 * tool calls/results come from node updates; an interrupt becomes approval requests.
 * The caller writes the surrounding `start` / `finish` chunks.
 */
export async function translateGraphStream(
    stream: AsyncIterable<unknown>,
    writer: UIMessageStreamWriter<UIMessage>,
    deps: { registry: AiToolRegistry; ctx: AiToolContext },
): Promise<void> {
    let textId: string | null = null;
    const closeText = () => {
        if (textId) writer.write({ type: 'text-end', id: textId });
        textId = null;
    };

    for await (const raw of stream) {
        const part = asStreamPart(raw);
        if (!part) continue;
        const [mode, payload] = part;

        if (mode === 'messages') {
            if (!Array.isArray(payload)) continue;
            const [chunk, meta]: unknown[] = payload;
            if (!isRecord(meta) || meta.langgraph_node !== AGENT_NODE || !AIMessageChunk.isInstance(chunk)) continue;
            const delta = chunk.text;
            if (!delta) continue;
            if (!textId) {
                textId = randomUUID();
                writer.write({ type: 'text-start', id: textId });
            }
            writer.write({ type: 'text-delta', id: textId, delta });
            continue;
        }

        if (mode !== 'updates' || !isRecord(payload)) continue;
        closeText();

        for (const message of messagesOf(payload[AGENT_NODE])) {
            if (!AIMessage.isInstance(message)) continue;
            for (const call of message.tool_calls ?? []) {
                if (!call.id) continue;
                const toolName = fromModelToolName(call.name);
                const risk = deps.registry.find(deps.ctx, toolName)?.risk ?? 'read';
                writer.write({ type: 'data-toolMeta', id: call.id, data: { toolCallId: call.id, risk } });
                writer.write({ type: 'tool-input-available', toolCallId: call.id, toolName, input: call.args, dynamic: true });
            }
        }

        for (const message of messagesOf(payload[TOOLS_NODE])) {
            if (!ToolMessage.isInstance(message)) continue;
            const result = isAiToolResult(message.artifact) ? message.artifact : undefined;
            if (!result || result.kind === 'output') {
                writer.write({
                    type: 'tool-output-available',
                    toolCallId: message.tool_call_id,
                    output: result?.kind === 'output' ? result.output : message.content,
                    dynamic: true,
                });
            } else if (result.kind === 'denied') {
                writer.write({ type: 'tool-output-denied', toolCallId: message.tool_call_id });
            } else {
                writer.write({ type: 'tool-output-error', toolCallId: message.tool_call_id, errorText: result.errorText, dynamic: true });
            }
        }

        const interrupts = payload[INTERRUPT];
        if (Array.isArray(interrupts)) {
            for (const item of interrupts) {
                const value: unknown = isRecord(item) ? item.value : undefined;
                if (!isApprovalInterrupt(value)) continue;
                for (const call of value.calls) {
                    writer.write({ type: 'tool-approval-request', approvalId: call.toolCallId, toolCallId: call.toolCallId });
                }
            }
        }
    }
    closeText();
}
