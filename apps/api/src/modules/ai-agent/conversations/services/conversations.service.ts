import { Injectable, NotFoundException } from '@nestjs/common';
import type { AiConversation, Prisma } from '@devloggers/db-prisma';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationPresenter } from '../presenters/conversation.presenter';
import type {
    AiMessagePageDto,
    ConversationPageDto,
    ConversationResponseDto,
    CreateConversationDto,
    CursorPageQueryDto,
    UpdateConversationDto,
} from '../dto/conversation.dto';

export type StoredUiMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    parts: Record<string, unknown>[];
};

const DEFAULT_PAGE = 20;
const TITLE_LENGTH = 60;

/** JSON round-trip: UIMessage parts are plain data; this yields a Prisma JSON value without casts on API data. */
function toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class ConversationsService {
    constructor(
        private readonly repository: ConversationsRepository,
        private readonly presenter: ConversationPresenter,
    ) {}

    async getOwned(tenantId: string, userId: string, id: string): Promise<AiConversation> {
        const conversation = await this.repository.findOwned(tenantId, userId, id);
        if (!conversation) throw new NotFoundException('Conversation not found');
        return conversation;
    }

    async list(tenantId: string, userId: string, query: CursorPageQueryDto): Promise<ConversationPageDto> {
        const limit = query.limit ?? DEFAULT_PAGE;
        const rows = await this.repository.listPage(tenantId, userId, limit + 1, query.cursor);
        const page = rows.slice(0, limit);
        return {
            items: page.map((row) => this.presenter.toConversation(row)),
            // `rows.length > limit` guarantees `page` has `limit` (>= 1) items — safe under noUncheckedIndexedAccess.
            nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
        };
    }

    async create(tenantId: string, userId: string, dto: CreateConversationDto): Promise<ConversationResponseDto> {
        const created = await this.repository.create(tenantId, userId, dto.title?.trim() || null);
        return this.presenter.toConversation(created);
    }

    async rename(tenantId: string, userId: string, id: string, dto: UpdateConversationDto): Promise<ConversationResponseDto> {
        await this.getOwned(tenantId, userId, id);
        return this.presenter.toConversation(await this.repository.update(id, { title: dto.title.trim() }));
    }

    async delete(tenantId: string, userId: string, id: string): Promise<void> {
        await this.getOwned(tenantId, userId, id);
        await this.repository.deleteWithCheckpoints(id);
    }

    async messages(tenantId: string, userId: string, id: string, query: CursorPageQueryDto): Promise<AiMessagePageDto> {
        await this.getOwned(tenantId, userId, id);
        const limit = query.limit ?? DEFAULT_PAGE;
        const rows = await this.repository.messagesPage(id, limit + 1, query.cursor);
        const page = rows.slice(0, limit);
        return {
            items: page.map((row) => this.presenter.toMessage(row)),
            // `rows.length > limit` guarantees `page` has `limit` (>= 1) items — safe under noUncheckedIndexedAccess.
            nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
        };
    }

    async saveUserMessage(conversation: AiConversation, message: { id: string; text: string }): Promise<void> {
        await this.repository.createMessage({
            id: message.id,
            tenantId: conversation.tenantId,
            conversationId: conversation.id,
            role: 'USER',
            parts: toJson([{ type: 'text', text: message.text }]),
        });
        await this.repository.update(conversation.id, {
            lastMessageAt: new Date(),
            ...(conversation.title ? {} : { title: message.text.trim().slice(0, TITLE_LENGTH) }),
        });
    }

    async findLastAssistantMessage(conversationId: string): Promise<StoredUiMessage | null> {
        const row = await this.repository.findLastAssistant(conversationId);
        if (!row) return null;
        const dto = this.presenter.toMessage(row);
        return { id: dto.id, role: 'assistant', parts: dto.parts };
    }

    async upsertAssistantMessage(
        conversation: AiConversation,
        message: StoredUiMessage,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.repository.upsertMessage({
            id: message.id,
            tenantId: conversation.tenantId,
            conversationId: conversation.id,
            role: 'ASSISTANT',
            parts: toJson(message.parts),
            ...(metadata ? { metadata: toJson(metadata) } : {}),
        });
        await this.repository.update(conversation.id, { lastMessageAt: new Date() });
    }
}
