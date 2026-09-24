import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

export type ApprovalDecision = { toolCallId: string; approved: boolean; reason?: string };

export type PendingApprovalCall = {
    toolCallId: string;
    name: string;
    risk: 'write' | 'destructive';
    input: Record<string, unknown>;
};

export type ApprovalInterrupt = { calls: PendingApprovalCall[] };
export type ApprovalResume = { decisions: ApprovalDecision[] };

export const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,
    /** Domains pulled in by tools.load; persists across turns via the checkpointer. */
    loadedDomains: Annotation<string[]>({
        reducer: (current, update) => [...new Set([...current, ...update])],
        default: () => [],
    }),
    /** Decisions for the current tool batch; reset by the agent node every step. */
    decisions: Annotation<Record<string, ApprovalDecision>>({
        reducer: (_current, update) => update,
        default: () => ({}),
    }),
});

export type AgentStateValue = typeof AgentState.State;
