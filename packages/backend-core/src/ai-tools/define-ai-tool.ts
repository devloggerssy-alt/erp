import type { AiTool, AiToolDefinition } from './ai-tool.types.js';

/** Erases the input type: validation and the handler are closed over in `prepare`. */
export function defineAiTool<I, O>(def: AiToolDefinition<I, O>): AiTool {
  return {
    name: def.name,
    domain: def.domain,
    resource: def.resource,
    description: def.description,
    risk: def.risk,
    permission: def.permission,
    enabled: def.enabled ?? true,
    jsonSchema: def.input.jsonSchema,
    async prepare(raw) {
      const result = await def.input.validate(raw);
      if (!result.ok) return { ok: false, errors: result.errors };
      return { ok: true, run: (ctx) => def.handler(ctx, result.value) };
    },
  };
}
