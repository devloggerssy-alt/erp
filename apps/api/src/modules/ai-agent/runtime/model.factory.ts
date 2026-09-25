import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

/**
 * `@langchain/openai`'s own reasoning-model detection (o-series, gpt-5) predates newer
 * reasoning-capable families, so it never sends `reasoning_effort` for them — but OpenAI's
 * Chat Completions API still applies a non-'none' default reasoning effort for those models
 * server-side, which it then rejects once function tools are bound (our agent graph always
 * binds tools). Detect the same families ourselves and force `reasoning_effort: 'none'` so
 * tool-calling keeps working over Chat Completions.
 */
function isReasoningCapableModel(model: string): boolean {
    return /^o\d/.test(model) || /^gpt-[5-9]/.test(model);
}

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
                return new ChatOpenAI({
                    model,
                    apiKey,
                    streaming: true,
                    ...(isReasoningCapableModel(model) ? { modelKwargs: { reasoning_effort: 'none' } } : {}),
                });
            default:
                throw new ServiceUnavailableException(`Unsupported AI_PROVIDER "${provider}"`);
        }
    }
}
