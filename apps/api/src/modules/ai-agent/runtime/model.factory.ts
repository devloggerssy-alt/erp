import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

/** One provider today; adding one = a new case + its @langchain/* package. */
@Injectable()
export class ChatModelFactory {
    constructor(private readonly config: ConfigService) {}

    describe(): { provider: string; model: string | null } {
        return {
            provider: this.config.get<string>('ai.provider') ?? 'openai',
            model: this.config.get<string>('ai.model') ?? null,
        };
    }

    create(): ChatOpenAI {
        const { provider, model } = this.describe();
        const apiKey = this.config.get<string>('ai.apiKey');
        if (!model) throw new ServiceUnavailableException('AI_MODEL is not configured');
        switch (provider) {
            case 'openai':
                if (!apiKey) throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
                return new ChatOpenAI({ model, apiKey, streaming: true });
            default:
                throw new ServiceUnavailableException(`Unsupported AI_PROVIDER "${provider}"`);
        }
    }
}
