import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { AiConversation, AiMessage, AiMessageRole, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class ConversationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findOwned(tenantId: string, userId: string, id: string): Promise<AiConversation | null> {
        return this.prisma.aiConversation.findFirst({ where: { id, tenantId, userId } });
    }

    listPage(tenantId: string, userId: string, take: number, cursor?: string): Promise<AiConversation[]> {
        return this.prisma.aiConversation.findMany({
            where: { tenantId, userId },
            orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
            take,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
    }

    create(tenantId: string, userId: string, title: string | null): Promise<AiConversation> {
        return this.prisma.aiConversation.create({ data: { tenantId, userId, title } });
    }

    update(id: string, data: Prisma.AiConversationUpdateInput): Promise<AiConversation> {
        return this.prisma.aiConversation.update({ where: { id }, data });
    }

    /** Messages cascade by FK; checkpoints have no FK (LangGraph owns their shape). */
    async deleteWithCheckpoints(id: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.aiCheckpointWrite.deleteMany({ where: { threadId: id } }),
            this.prisma.aiCheckpoint.deleteMany({ where: { threadId: id } }),
            this.prisma.aiConversation.delete({ where: { id } }),
        ]);
    }

    messagesPage(conversationId: string, take: number, cursor?: string): Promise<AiMessage[]> {
        return this.prisma.aiMessage.findMany({
            where: { conversationId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
    }

    findLastAssistant(conversationId: string): Promise<AiMessage | null> {
        return this.prisma.aiMessage.findFirst({
            where: { conversationId, role: 'ASSISTANT' },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    }

    createMessage(data: {
        id: string;
        tenantId: string;
        conversationId: string;
        role: AiMessageRole;
        parts: Prisma.InputJsonValue;
    }): Promise<AiMessage> {
        return this.prisma.aiMessage.create({ data });
    }

    upsertMessage(data: {
        id: string;
        tenantId: string;
        conversationId: string;
        role: AiMessageRole;
        parts: Prisma.InputJsonValue;
        metadata?: Prisma.InputJsonValue;
    }): Promise<AiMessage> {
        const { id, parts, metadata } = data;
        return this.prisma.aiMessage.upsert({
            where: { id },
            create: data,
            update: { parts, ...(metadata !== undefined ? { metadata } : {}) },
        });
    }
}
