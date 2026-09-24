import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { createUIMessageStream, pipeUIMessageStreamToResponse, type UIMessage } from 'ai';
import type { AiConversation } from '@devloggers/db-prisma';
import type { AiToolContext, RequestUser } from '@devloggers/backend-core';
import { PermissionResolverService } from '../../identity/auth/guards';
import { ConversationsService, type StoredUiMessage } from '../conversations/services/conversations.service';
import { AiToolRegistry } from '../tools/ai-tool-registry';
import { AiToolExecutor } from '../tools/ai-tool-executor';
import { ChatModelFactory } from '../runtime/model.factory';
import { PrismaCheckpointSaver } from '../runtime/prisma-checkpoint-saver';
import { buildAgentGraph, type AgentGraph } from '../runtime/agent-graph';
import type { ApprovalDecision, PendingApprovalCall } from '../runtime/agent-state';
import { isApprovalInterrupt, translateGraphStream } from './ui-stream.translator';
import { ChatRateLimiter } from './chat-rate-limiter';
import type { ChatRequestDto } from './dto/chat-request.dto';

const RECURSION_LIMIT = 25;
/** Token deltas from the agent node + per-node updates (tool calls, tool results, interrupts). */
const TURN_STREAM_MODES: ('messages' | 'updates')[] = ['messages', 'updates'];
/** The model may (rarely) retry a rejected action; bound the supersede loop. */
const MAX_SUPERSEDE_ROUNDS = 3;
const CLIENT_ERROR_TEXT = 'The assistant failed to respond. Please try again.';

type GraphConfig = { configurable: { thread_id: string; tenant_id: string }; recursionLimit: number };

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toUiMessage(stored: StoredUiMessage): UIMessage {
    // Parts were produced by the AI SDK itself (stored verbatim in onFinish) — shape is the SDK's own.
    return { id: stored.id, role: stored.role, parts: stored.parts as UIMessage['parts'] };
}

/** Marks still-pending approval parts as denied (superseded by a new user message). */
function supersedeApprovalParts(parts: Record<string, unknown>[]): Record<string, unknown>[] {
    return parts.map((part) =>
        part.state === 'approval-requested'
            ? {
                  ...part,
                  state: 'output-denied',
                  approval: { ...(isRecord(part.approval) ? part.approval : {}), approved: false, reason: 'superseded' },
              }
            : part,
    );
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private readonly conversations: ConversationsService,
        private readonly registry: AiToolRegistry,
        private readonly executor: AiToolExecutor,
        private readonly models: ChatModelFactory,
        private readonly checkpointer: PrismaCheckpointSaver,
        private readonly permissions: PermissionResolverService,
        private readonly rateLimiter: ChatRateLimiter,
    ) {}

    /**
     * Everything up to `pipeUIMessageStreamToResponse` may throw a normal HTTP error
     * (400/404/409/429/503) — nothing has been written to `res` yet.
     */
    async stream(user: RequestUser, conversationId: string, body: ChatRequestDto, locale: string, res: Response): Promise<void> {
        const approvals = body.approvals ?? [];
        if (Boolean(body.message) === approvals.length > 0) {
            throw new BadRequestException('Send exactly one of "message" or "approvals"');
        }
        const conversation = await this.conversations.getOwned(user.tenantId, user.id, conversationId);
        this.rateLimiter.consume(user.id);

        const ctx: AiToolContext = {
            tenantId: user.tenantId,
            userId: user.id,
            permissions: await this.permissions.resolve(user.id, user.tenantId),
            locale,
            conversationId,
        };
        const graph = buildAgentGraph({
            ctx,
            model: this.models.create(),
            registry: this.registry,
            executor: this.executor,
            checkpointer: this.checkpointer,
        });
        const config: GraphConfig = {
            configurable: { thread_id: conversationId, tenant_id: user.tenantId },
            recursionLimit: RECURSION_LIMIT,
        };
        const pending = await this.pendingApprovals(graph, config);

        let resumeDecisions: ApprovalDecision[] | null = null;
        let original: StoredUiMessage | null = null;

        if (body.message) {
            if (pending.length > 0) await this.supersede(graph, config, conversation, pending);
            await this.conversations.saveUserMessage(conversation, body.message);
        } else {
            this.assertDecisionsMatch(pending, approvals);
            resumeDecisions = approvals.map(({ toolCallId, approved, reason }) => ({
                toolCallId,
                approved,
                ...(reason ? { reason } : {}),
            }));
            original = await this.conversations.findLastAssistantMessage(conversationId);
        }

        const userText = body.message?.text ?? '';
        const uiStream = createUIMessageStream<UIMessage>({
            originalMessages: original ? [toUiMessage(original)] : undefined,
            generateId: () => randomUUID(),
            execute: async ({ writer }) => {
                // createUIMessageStream does not emit start/finish itself; `start` gets the message id injected.
                writer.write({ type: 'start' });
                const options = { ...config, streamMode: TURN_STREAM_MODES };
                const events = resumeDecisions
                    ? await graph.stream(new Command({ resume: { decisions: resumeDecisions } }), options)
                    : await graph.stream({ messages: [new HumanMessage(userText)] }, options);
                await translateGraphStream(events, writer, { registry: this.registry, ctx });
                writer.write({ type: 'finish' });
            },
            onError: (error) => {
                // Also invoked (with the client text) when the SDK's stream processor sees our own `error` chunk.
                if (!(error instanceof Error && error.message === CLIENT_ERROR_TEXT)) {
                    this.logger.error({ msg: 'AI chat stream failed', conversationId, error: errorMessage(error) });
                }
                return CLIENT_ERROR_TEXT;
            },
            onFinish: async ({ responseMessage }) => {
                try {
                    await this.persistAssistant(conversation, responseMessage);
                } catch (error) {
                    this.logger.error({ msg: 'AI chat persist failed', conversationId, error: errorMessage(error) });
                }
            },
        });

        // Tee: the client branch may disconnect; the drain branch always runs the stream
        // to completion so onFinish persists the result.
        const [clientStream, drainStream] = uiStream.tee();
        void this.drain(drainStream, conversationId);
        pipeUIMessageStreamToResponse({ response: res, stream: clientStream }).catch((error: unknown) => {
            this.logger.warn({ msg: 'AI chat response write failed', conversationId, error: errorMessage(error) });
        });
    }

    private async pendingApprovals(graph: AgentGraph, config: GraphConfig): Promise<PendingApprovalCall[]> {
        const state = await graph.getState(config);
        return state.tasks.flatMap((task) =>
            task.interrupts.flatMap((item): PendingApprovalCall[] => {
                const value: unknown = item.value;
                return isApprovalInterrupt(value) ? value.calls : [];
            }),
        );
    }

    /** A resume must answer exactly the pending tool calls — anything else is stale or forged. */
    private assertDecisionsMatch(pending: PendingApprovalCall[], decisions: { toolCallId: string }[]): void {
        const expected = new Set(pending.map((call) => call.toolCallId));
        const received = new Set(decisions.map((decision) => decision.toolCallId));
        const same =
            expected.size > 0 &&
            decisions.length === received.size &&
            expected.size === received.size &&
            [...expected].every((id) => received.has(id));
        if (!same) throw new ConflictException('These approvals do not match the pending actions. Reload the conversation.');
    }

    /**
     * A new user message while approvals are pending: reject them first, otherwise the history would be
     * AI(tool_calls) + Human with no ToolMessages, which the provider rejects.
     */
    private async supersede(
        graph: AgentGraph,
        config: GraphConfig,
        conversation: AiConversation,
        initial: PendingApprovalCall[],
    ): Promise<void> {
        let pending = initial;
        for (let round = 0; round < MAX_SUPERSEDE_ROUNDS && pending.length > 0; round++) {
            const decisions: ApprovalDecision[] = pending.map((call) => ({ toolCallId: call.toolCallId, approved: false, reason: 'superseded' }));
            const run = await graph.stream(new Command({ resume: { decisions } }), { ...config, streamMode: 'updates' });
            for await (const _update of run) {
                // drain — the model's reply to the rejection is not shown; the new message follows.
            }
            pending = await this.pendingApprovals(graph, config);
        }
        if (pending.length > 0) {
            throw new ConflictException('The assistant still has pending actions. Reload the conversation.');
        }
        const last = await this.conversations.findLastAssistantMessage(conversation.id);
        if (last) {
            await this.conversations.upsertAssistantMessage(conversation, { ...last, parts: supersedeApprovalParts(last.parts) });
        }
    }

    private async persistAssistant(conversation: AiConversation, message: UIMessage): Promise<void> {
        const plain: unknown = JSON.parse(JSON.stringify(message.parts));
        const parts = Array.isArray(plain) ? plain.filter(isRecord) : [];
        await this.conversations.upsertAssistantMessage(
            conversation,
            { id: message.id, role: 'assistant', parts },
            { model: this.models.describe().model },
        );
    }

    private async drain(stream: ReadableStream<unknown>, conversationId: string): Promise<void> {
        const reader = stream.getReader();
        try {
            for (;;) {
                const { done } = await reader.read();
                if (done) return;
            }
        } catch (error) {
            this.logger.error({ msg: 'AI chat drain failed', conversationId, error: errorMessage(error) });
        }
    }
}
