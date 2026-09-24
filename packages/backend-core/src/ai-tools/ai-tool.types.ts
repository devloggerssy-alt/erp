import type { PermissionKey } from '@devloggers/api-contracts';

/** `read` runs immediately; `write` / `destructive` wait for user approval. */
export type AiToolRisk = 'read' | 'write' | 'destructive';

/** Built from the JWT on every request — never from model output. */
export interface AiToolContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly permissions: ReadonlySet<string>;
  readonly locale: string;
  readonly conversationId: string;
}

/** The subset of JSON Schema that tool inputs use. A type alias so it is assignable to Record<string, unknown>. */
export type JsonSchema = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number)[];
  format?: string;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean;
};

export type AiToolValidation<I> =
  | { ok: true; value: I }
  | { ok: false; errors: Record<string, string[]> };

export interface AiToolInput<I> {
  readonly jsonSchema: JsonSchema;
  validate(raw: unknown): Promise<AiToolValidation<I>>;
}

export interface AiToolDefinition<I, O> {
  /** `domain-noun.verb`, e.g. `units.create`. Must not contain `__`. */
  readonly name: `${string}.${string}`;
  /** Domain key from apps/api/src/domain/manifest.ts. */
  readonly domain: string;
  /** api-contracts resource key, when the tool acts on one resource. */
  readonly resource?: string;
  /** Written for the model. */
  readonly description: string;
  readonly risk: AiToolRisk;
  /** Same key as the HTTP route's @RequirePermission. */
  readonly permission: PermissionKey;
  readonly input: AiToolInput<I>;
  readonly handler: (ctx: AiToolContext, input: I) => Promise<O>;
  /** Code-level kill switch. Default true. */
  readonly enabled?: boolean;
}

export type AiToolPrepared =
  | { ok: true; run(ctx: AiToolContext): Promise<unknown> }
  | { ok: false; errors: Record<string, string[]> };

/** A tool with its input type erased: validation and execution are closed over. */
export interface AiTool {
  readonly name: `${string}.${string}`;
  readonly domain: string;
  readonly resource?: string;
  readonly description: string;
  readonly risk: AiToolRisk;
  readonly permission: PermissionKey;
  readonly enabled: boolean;
  readonly jsonSchema: JsonSchema;
  prepare(raw: unknown): Promise<AiToolPrepared>;
}

/** Implemented by classes decorated with @AiToolProvider(). */
export interface AiToolSource {
  aiTools(): readonly AiTool[];
}

export type AiToolResult =
  | { kind: 'output'; output: unknown }
  | { kind: 'error'; errorText: string; details?: unknown }
  | { kind: 'denied'; reason: string };
