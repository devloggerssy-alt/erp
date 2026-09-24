import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ConversationsController } from './conversations/controllers/conversations.controller';
import { ConversationsRepository } from './conversations/repositories/conversations.repository';
import { ConversationPresenter } from './conversations/presenters/conversation.presenter';
import { ConversationsService } from './conversations/services/conversations.service';
import { AiToolRegistry } from './tools/ai-tool-registry';
import { AiToolExecutor } from './tools/ai-tool-executor';
import { MetaToolsProvider } from './tools/meta-tools.provider';
import { PrismaCheckpointSaver } from './runtime/prisma-checkpoint-saver';
import { ChatModelFactory } from './runtime/model.factory';

@Module({
    imports: [DiscoveryModule],
    controllers: [ConversationsController],
    providers: [
        ConversationsRepository,
        ConversationPresenter,
        ConversationsService,
        AiToolRegistry,
        AiToolExecutor,
        MetaToolsProvider,
        PrismaCheckpointSaver,
        ChatModelFactory,
    ],
})
export class AiAgentModule {}
