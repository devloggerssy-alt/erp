import type { ToolCall } from '@langchain/core/messages';
import type { AiTool, AiToolContext, AiToolResult } from '@devloggers/backend-core';
import type { AiToolRegistry } from '../tools/ai-tool-registry';
import { fromModelToolName } from '../tools/tool-names';
import type { ApprovalDecision, PendingApprovalCall } from './agent-state';

/** `gate` runs before the approval interrupt; `execute` runs after it, with the user's decisions. */
export type ToolCallPhase =
    | { readonly phase: 'gate' }
    | { readonly phase: 'execute'; readonly decisions: Readonly<Record<string, ApprovalDecision>> };

export type ToolCallDisposition =
    | { kind: 'run'; toolCallId: string; name: string; tool: AiTool; args: Record<string, unknown> }
    | { kind: 'needs-approval'; toolCallId: string; pending: PendingApprovalCall }
    | { kind: 'reject'; toolCallId: string; name: string; result: AiToolResult };

/**
 * Decides what happens to each tool call the model proposed — the one place that
 * enforces "no write or destructive tool runs without an approval decision".
 * Returns one disposition per id-bearing call, in model order. Never executes anything:
 * `prepare()` is only used to tell invalid input (the executor reports it) from a
 * valid call that still needs approval.
 */
export async function planToolCalls(
    registry: Pick<AiToolRegistry, 'find'>,
    ctx: AiToolContext,
    calls: readonly ToolCall[],
    phase: ToolCallPhase,
): Promise<ToolCallDisposition[]> {
    const dispositions: ToolCallDisposition[] = [];

    for (const call of calls) {
        if (!call.id) continue; // no id to attach a ToolMessage or approval to
        const toolCallId = call.id;
        const name = fromModelToolName(call.name);
        const tool = registry.find(ctx, name);
        if (!tool) {
            dispositions.push({
                kind: 'reject',
                toolCallId,
                name,
                result: { kind: 'error', errorText: `Tool "${name}" is unknown or not permitted` },
            });
            continue;
        }
        const run: ToolCallDisposition = { kind: 'run', toolCallId, name, tool, args: call.args };
        if (tool.risk === 'read') {
            dispositions.push(run);
            continue;
        }

        const decision = phase.phase === 'execute' ? phase.decisions[toolCallId] : undefined;
        if (decision) {
            dispositions.push(
                decision.approved
                    ? run
                    : { kind: 'reject', toolCallId, name, result: { kind: 'denied', reason: decision.reason ?? 'no reason given' } },
            );
            continue;
        }

        const prepared = await tool.prepare(call.args);
        if (!prepared.ok) {
            // Nothing runs: the executor re-validates and reports the input errors to the model.
            dispositions.push(run);
            continue;
        }
        dispositions.push(
            phase.phase === 'gate'
                ? { kind: 'needs-approval', toolCallId, pending: { toolCallId, name, risk: tool.risk, input: call.args } }
                : { kind: 'reject', toolCallId, name, result: { kind: 'denied', reason: 'approval missing' } },
        );
    }

    return dispositions;
}
