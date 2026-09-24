import { Injectable } from '@nestjs/common';
import type { AiConversation, AiMessage } from '@devloggers/db-prisma';
import { AiMessageResponseDto, AiMessageRoleEnum, ConversationResponseDto } from '../dto/conversation.dto';

function asPartArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter((part): part is Record<string, unknown> => part !== null && typeof part === 'object')
        : [];
}

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

@Injectable()
export class ConversationPresenter {
    toConversation(entity: AiConversation): ConversationResponseDto {
        return {
            id: entity.id,
            title: entity.title,
            lastMessageAt: entity.lastMessageAt.toISOString(),
            createdAt: entity.createdAt.toISOString(),
        };
    }

    toMessage(entity: AiMessage): AiMessageResponseDto {
        return {
            id: entity.id,
            role: AiMessageRoleEnum[entity.role],
            parts: asPartArray(entity.parts),
            metadata: asRecordOrNull(entity.metadata),
            createdAt: entity.createdAt.toISOString(),
        };
    }
}
