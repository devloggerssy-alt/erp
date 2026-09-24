import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { PermissionsModule } from '../identity/auth/guards';
import { ConversationsController } from './conversations/controllers/conversations.controller';
import { ConversationsRepository } from './conversations/repositories/conversations.repository';
import { ConversationPresenter } from './conversations/presenters/conversation.presenter';
import { ConversationsService } from './conversations/services/conversations.service';
import { AiToolRegistry } from './tools/ai-tool-registry';
import { AiToolExecutor } from './tools/ai-tool-executor';
import { MetaToolsProvider } from './tools/meta-tools.provider';
import { PrismaCheckpointSaver } from './runtime/prisma-checkpoint-saver';
import { ChatModelFactory } from './runtime/model.factory';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { ChatRateLimiter } from './chat/chat-rate-limiter';

@Module({
    imports: [DiscoveryModule, PermissionsModule],
    controllers: [ConversationsController, ChatController],
    providers: [
        ConversationsRepository,
        ConversationPresenter,
        ConversationsService,
        AiToolRegistry,
        AiToolExecutor,
        MetaToolsProvider,
        PrismaCheckpointSaver,
        ChatModelFactory,
        ChatService,
        ChatRateLimiter,
    ],
})
export class AiAgentModule {}
