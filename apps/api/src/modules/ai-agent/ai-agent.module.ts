import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations/controllers/conversations.controller';
import { ConversationsRepository } from './conversations/repositories/conversations.repository';
import { ConversationPresenter } from './conversations/presenters/conversation.presenter';
import { ConversationsService } from './conversations/services/conversations.service';

@Module({
    controllers: [ConversationsController],
    providers: [ConversationsRepository, ConversationPresenter, ConversationsService],
})
export class AiAgentModule {}
