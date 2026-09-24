import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '../../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import {
    ApiCreatedResponseStandard,
    ApiOkResponseStandard,
    ApiStandardErrors,
} from '../../../../common/decorators/api-swagger.decorators';
import { ConversationsService } from '../services/conversations.service';
import {
    AiMessagePageDto,
    ConversationPageDto,
    ConversationResponseDto,
    CreateConversationDto,
    CursorPageQueryDto,
    UpdateConversationDto,
} from '../dto/conversation.dto';

@ApiTags('AI / Agent')
@Controller('ai/conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ConversationsController {
    constructor(private readonly conversations: ConversationsService) {}

    @Get()
    @RequirePermission('ai.view')
    @ApiOperation({ summary: 'List my AI conversations', description: 'Cursor-paginated, most recently active first.' })
    @ApiOkResponseStandard(ConversationPageDto, { description: 'Conversation page' })
    @ApiStandardErrors()
    async list(@CurrentUser() user: RequestUser, @Query() query: CursorPageQueryDto) {
        return ApiResponseBuilder.success(await this.conversations.list(user.tenantId, user.id, query), 'AI conversations');
    }

    @Post()
    @RequirePermission('ai.use')
    @ApiOperation({ summary: 'Create an AI conversation' })
    @ApiCreatedResponseStandard(ConversationResponseDto, { description: 'Conversation created' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateConversationDto) {
        return ApiResponseBuilder.success(await this.conversations.create(user.tenantId, user.id, dto), 'Conversation created');
    }

    @Patch(':id')
    @RequirePermission('ai.use')
    @ApiOperation({ summary: 'Rename an AI conversation' })
    @ApiOkResponseStandard(ConversationResponseDto, { description: 'Conversation renamed' })
    @ApiStandardErrors()
    async rename(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
        return ApiResponseBuilder.success(await this.conversations.rename(user.tenantId, user.id, id, dto), 'Conversation updated');
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermission('ai.use')
    @ApiOperation({ summary: 'Delete an AI conversation', description: 'Deletes its messages and the agent checkpoints.' })
    @ApiNoContentResponse({ description: 'Conversation deleted' })
    @ApiStandardErrors()
    async remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
        await this.conversations.delete(user.tenantId, user.id, id);
    }

    @Get(':id/messages')
    @RequirePermission('ai.view')
    @ApiOperation({ summary: 'List messages of an AI conversation', description: 'Cursor-paginated, newest first.' })
    @ApiOkResponseStandard(AiMessagePageDto, { description: 'Message page' })
    @ApiStandardErrors()
    async messages(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query() query: CursorPageQueryDto) {
        return ApiResponseBuilder.success(await this.conversations.messages(user.tenantId, user.id, id, query), 'AI messages');
    }
}
