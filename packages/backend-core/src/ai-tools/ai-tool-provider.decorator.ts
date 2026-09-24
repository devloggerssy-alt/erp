import { SetMetadata } from '@nestjs/common';

export const AI_TOOL_PROVIDER_METADATA = 'devloggers:ai-tool-provider';

/**
 * Marks an injectable class implementing `AiToolSource` so the ai-agent
 * registry discovers it. Register the class in the owning domain's module;
 * when that domain is disabled its tools disappear with it.
 */
export const AiToolProvider = (): ClassDecorator => SetMetadata(AI_TOOL_PROVIDER_METADATA, true);
