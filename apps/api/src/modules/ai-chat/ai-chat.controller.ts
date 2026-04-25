import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { CreateSessionDto, SendMessageDto } from './dto/ai-chat.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('AI Assistant')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AiChatController {
    constructor(private readonly aiChatService: AiChatService) {}

    /** Get the currently active AI model */
    @Get('model')
    @ApiOperation({ summary: 'Get active AI model', description: 'Returns the currently configured AI model name and provider (e.g., Gemini, OpenAI). The model can be switched via server configuration.' })
    @ApiOkResponse({
        description: 'Active AI model info',
        schema: {
            example: {
                message: 'Active AI model',
                data: { provider: 'google', model: 'gemini-2.0-flash' },
            },
        },
    })
    @ApiStandardErrors()
    getModel() {
        return ApiResponseBuilder.success(this.aiChatService.getActiveModel(), 'Active AI model');
    }

    @Get('sessions')
    @ApiOperation({ summary: 'List AI chat sessions' })
    @ApiOkResponse({
        description: 'AI sessions list retrieved',
        schema: {
            example: {
                message: 'AI sessions',
                data: [
                    { id: '...', title: 'Monthly sales analysis', createdAt: '2026-04-14T10:00:00.000Z', messageCount: 5 },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        return ApiResponseBuilder.success(await this.aiChatService.findAllSessions(user.tenantId, user.id), 'AI sessions');
    }

    @Post('sessions')
    @ApiOperation({ summary: 'Create a new AI chat session' })
    @ApiCreatedResponse({
        description: 'AI session created',
        schema: {
            example: {
                message: 'Session created',
                data: { id: '...', title: 'Monthly sales analysis', createdAt: '2026-04-14T10:00:00.000Z' },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateSessionDto) {
        return ApiResponseBuilder.success(await this.aiChatService.createSession(user.tenantId, user.id, dto.title), 'Session created');
    }

    @Get('sessions/:id')
    @ApiOperation({ summary: 'Get AI session with messages' })
    @ApiOkResponse({
        description: 'Session details with full message history',
        schema: {
            example: {
                message: 'Session details',
                data: {
                    id: '...', title: 'Monthly sales analysis',
                    messages: [
                        { role: 'user', content: 'What were the top 5 selling items last month?' },
                        { role: 'assistant', content: 'Based on the sales data...' },
                    ],
                },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.aiChatService.findSessionById(user.tenantId, user.id, id), 'Session details');
    }

    @Post('sessions/:id/messages')
    @ApiOperation({
        summary: 'Send a message to the AI assistant',
        description: 'Sends a user message to the AI assistant within an existing session. The AI uses the tenant\'s business data (invoices, inventory, sales) to provide contextual answers. Returns both the user message and the AI response.',
    })
    @ApiCreatedResponse({
        description: 'Message sent and AI response received',
        schema: {
            example: {
                message: 'Message sent',
                data: {
                    userMessage: { role: 'user', content: 'What were the top 5 selling items last month?' },
                    assistantMessage: { role: 'assistant', content: 'Based on the sales data, the top 5 selling items last month were...' },
                },
            },
        },
    })
    @ApiStandardErrors()
    async sendMessage(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
        return ApiResponseBuilder.success(await this.aiChatService.sendMessage(user.tenantId, user.id, id, dto.message), 'Message sent');
    }
}
