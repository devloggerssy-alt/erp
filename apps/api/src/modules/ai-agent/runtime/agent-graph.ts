import { AIMessage, HumanMessage, SystemMessage, ToolMessage, trimMessages, type BaseMessage } from '@langchain/core/messages';
import { END, START, StateGraph, interrupt } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { ChatOpenAI } from '@langchain/openai';
import type { AiTool, AiToolContext, AiToolResult } from '@devloggers/backend-core';
import type { AiToolRegistry } from '../tools/ai-tool-registry';
import type { AiToolExecutor } from '../tools/ai-tool-executor';
import { fromModelToolName, toModelToolName } from '../tools/tool-names';
import { AgentState, type AgentStateValue, type ApprovalInterrupt, type ApprovalResume, type PendingApprovalCall } from './agent-state';
import { buildSystemPrompt } from './system-prompt';

export const AGENT_NODE = 'agent';
export const GATE_NODE = 'gate';
export const TOOLS_NODE = 'tools';

const CONTEXT_TOKEN_BUDGET = 60_000;

export interface AgentGraphDeps {
    readonly ctx: AiToolContext;
    readonly model: ChatOpenAI;
    readonly registry: AiToolRegistry;
    readonly executor: AiToolExecutor;
    readonly checkpointer: BaseCheckpointSaver;
}

function toOpenAiTool(tool: AiTool) {
    return {
        type: 'function' as const,
        function: { name: toModelToolName(tool.name), description: tool.description, parameters: tool.jsonSchema },
    };
}

function lastAiMessage(messages: BaseMessage[]): AIMessage | undefined {
    const last = messages[messages.length - 1];
    return last instanceof AIMessage ? last : undefined;
}

function toolMessage(toolCallId: string, result: AiToolResult): ToolMessage {
    const forModel =
        result.kind === 'output'
            ? result.output
            : result.kind === 'denied'
              ? { rejected: true, message: `Rejected by user: ${result.reason}. Do not retry unless the user asks again.` }
              : { error: result.errorText, details: result.details };
    return new ToolMessage({
        tool_call_id: toolCallId,
        content: JSON.stringify(forModel),
        status: result.kind === 'output' ? 'success' : 'error',
        artifact: result,
    });
}

/** Rough, provider-neutral token estimate (~4 chars/token). */
function estimateTokens(messages: BaseMessage[]): number {
    return messages.reduce((total, message) => total + Math.ceil(JSON.stringify(message.content).length / 4), 0);
}

/**
 * `trimMessages` with `startOn: 'human'` returns `[]` when the current turn alone (the latest
 * human message plus its tool-call loop) already exceeds the token budget. Falling back to an
 * empty history would run the model with only the system prompt and silently drop the user's
 * question, so keep at least the current turn regardless of budget.
 */
function fallbackToCurrentTurn(messages: BaseMessage[]): BaseMessage[] {
    let lastHumanIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (HumanMessage.isInstance(messages[i])) {
            lastHumanIndex = i;
            break;
        }
    }
    return lastHumanIndex === -1 ? messages : messages.slice(lastHumanIndex);
}

export function buildAgentGraph(deps: AgentGraphDeps) {
    const { ctx, model, registry, executor, checkpointer } = deps;

    const agent = async (state: AgentStateValue) => {
        const tools = registry.forUser(ctx, state.loadedDomains);
        const bound = model.bindTools(tools.map(toOpenAiTool));
        const trimmed = await trimMessages(state.messages, {
            maxTokens: CONTEXT_TOKEN_BUDGET,
            strategy: 'last',
            tokenCounter: estimateTokens,
            startOn: 'human',
            allowPartial: false,
        });
        const history = trimmed.length > 0 ? trimmed : fallbackToCurrentTurn(state.messages);
        const response = await bound.invoke([new SystemMessage(buildSystemPrompt(ctx)), ...history]);
        return { messages: [response], decisions: {} };
    };

    const afterAgent = (state: AgentStateValue) =>
        (lastAiMessage(state.messages)?.tool_calls?.length ?? 0) > 0 ? GATE_NODE : END;

    // No side effects before interrupt(): LangGraph re-runs this node from the top on resume.
    const gate = async (state: AgentStateValue) => {
        const calls = lastAiMessage(state.messages)?.tool_calls ?? [];
        const pending: PendingApprovalCall[] = [];
        for (const call of calls) {
            const tool = registry.find(ctx, fromModelToolName(call.name));
            if (!call.id || !tool || tool.risk === 'read') continue;
            const prepared = await tool.prepare(call.args);
            if (!prepared.ok) continue; // invalid input is reported by the tools node without asking the user
            pending.push({ toolCallId: call.id, name: tool.name, risk: tool.risk, input: call.args });
        }
        if (pending.length === 0) return { decisions: {} };
        const resume = interrupt<ApprovalInterrupt, ApprovalResume>({ calls: pending });
        return { decisions: Object.fromEntries(resume.decisions.map((decision) => [decision.toolCallId, decision])) };
    };

    const tools = async (state: AgentStateValue) => {
        const calls = lastAiMessage(state.messages)?.tool_calls ?? [];
        const messages: ToolMessage[] = [];
        const loadedDomains: string[] = [];

        for (const call of calls) {
            if (!call.id) continue; // no id to attach a ToolMessage to; the gate already skips these too
            const toolCallId = call.id;
            const name = fromModelToolName(call.name);
            const tool = registry.find(ctx, name);
            if (!tool) {
                messages.push(toolMessage(toolCallId, { kind: 'error', errorText: `Tool "${name}" is unknown or not permitted` }));
                continue;
            }
            if (tool.risk !== 'read') {
                const decision = state.decisions[toolCallId];
                if (decision && !decision.approved) {
                    messages.push(toolMessage(toolCallId, { kind: 'denied', reason: decision.reason ?? 'no reason given' }));
                    continue;
                }
                if (!decision) {
                    // Only reachable when input was invalid (gate skipped it): let the executor report the validation error.
                    const prepared = await tool.prepare(call.args);
                    if (prepared.ok) {
                        messages.push(toolMessage(toolCallId, { kind: 'denied', reason: 'approval missing' }));
                        continue;
                    }
                }
            }
            const result = await executor.execute(ctx, tool, call.args, toolCallId);
            if (name === 'tools.load' && result.kind === 'output') {
                const loaded = (result.output as { loadedDomain?: unknown } | null)?.loadedDomain;
                if (typeof loaded === 'string') loadedDomains.push(loaded);
            }
            messages.push(toolMessage(toolCallId, result));
        }
        return { messages, loadedDomains };
    };

    return new StateGraph(AgentState)
        .addNode(AGENT_NODE, agent)
        .addNode(GATE_NODE, gate)
        .addNode(TOOLS_NODE, tools)
        .addEdge(START, AGENT_NODE)
        .addConditionalEdges(AGENT_NODE, afterAgent, [GATE_NODE, END])
        .addEdge(GATE_NODE, TOOLS_NODE)
        .addEdge(TOOLS_NODE, AGENT_NODE)
        .compile({ checkpointer });
}

export type AgentGraph = ReturnType<typeof buildAgentGraph>;
