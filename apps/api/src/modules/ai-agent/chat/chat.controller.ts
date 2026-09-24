import { Body, Controller, Get, Headers, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../../common/decorators/api-swagger.decorators';
import { AiModelResponseDto } from '../conversations/dto/conversation.dto';
import { ChatModelFactory } from '../runtime/model.factory';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('AI / Agent')
@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly models: ChatModelFactory,
    ) {}

    @Get('model')
    @RequirePermission('ai.view')
    @ApiOperation({ summary: 'Get the configured AI provider and model' })
    @ApiOkResponseStandard(AiModelResponseDto, { description: 'Active AI model' })
    @ApiStandardErrors()
    getModel() {
        return ApiResponseBuilder.success(this.models.describe(), 'Active AI model');
    }

    @Post('conversations/:id/chat')
    @RequirePermission('ai.use')
    @ApiOperation({
        summary: 'Send a message or approval decisions to the AI agent',
        description:
            'Server-Sent Events in the Vercel AI SDK UI message stream protocol (x-vercel-ai-ui-message-stream: v1). ' +
            'Body carries exactly one of `message` or `approvals`. 409 when approvals do not match the pending actions.',
    })
    @ApiBody({ type: ChatRequestDto })
    @ApiProduces('text/event-stream')
    @ApiOkResponse({ description: 'SSE stream of UI message chunks', schema: { type: 'string' } })
    @ApiStandardErrors()
    async chat(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() body: ChatRequestDto,
        @Headers('accept-language') acceptLanguage: string | undefined,
        @Res() res: Response,
    ): Promise<void> {
        const locale = (acceptLanguage ?? 'en').split(',')[0]?.trim() || 'en';
        await this.chatService.stream(user, id, body, locale, res);
    }
}
