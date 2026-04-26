import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class AiChatService {
    private readonly apiKey: string;
    private readonly model: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('ai.apiKey') || '';
        this.model = this.configService.get<string>('ai.model') || 'gemini-1.5-flash';
    }

    async findAllSessions(tenantId: string, userId: string) {
        return this.prisma.aiChatSession.findMany({
            where: { tenantId, userId },
            include: { _count: { select: { messages: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findSessionById(tenantId: string, userId: string, id: string) {
        const session = await this.prisma.aiChatSession.findFirst({
            where: { id, tenantId, userId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!session) throw new NotFoundException('Session not found');
        return session;
    }

    async createSession(tenantId: string, userId: string, title?: string) {
        return this.prisma.aiChatSession.create({
            data: { tenantId, userId, title },
        });
    }

    async sendMessage(tenantId: string, userId: string, sessionId: string, message: string) {
        if (!this.apiKey) {
            throw new BadRequestException('AI API key not configured. Set GEMINI_API_KEY in .env');
        }

        // Verify session belongs to user
        await this.findSessionById(tenantId, userId, sessionId);

        // Save user message
        await this.prisma.aiChatMessage.create({
            data: { tenantId, sessionId, role: 'USER', content: message },
        });

        // Fetch history for context
        const history = await this.prisma.aiChatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });

        // Build Gemini API request
        const contents = history.map((msg) => ({
            role: msg.role === 'USER' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents }),
            },
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as any;
            throw new BadRequestException(`AI API error: ${error?.error?.message || response.statusText}`);
        }

        const data = await response.json() as any;
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

        // Save assistant reply
        const assistantMsg = await this.prisma.aiChatMessage.create({
            data: { tenantId, sessionId, role: 'ASSISTANT', content: replyText },
        });

        // Update session timestamp
        await this.prisma.aiChatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
        });

        return {
            userMessage: message,
            assistantMessage: replyText,
            model: this.model,
            messageId: assistantMsg.id,
        };
    }

    getActiveModel(): { model: string } {
        return { model: this.model };
    }
}
