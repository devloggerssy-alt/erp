# AI Agent Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Gemini `ai-chat` domain with an `ai-agent` domain: a LangGraph agent (OpenAI) that calls code-registered, permission-filtered tools, pauses for user approval before risky tools, streams to a Vercel AI SDK v6 chat UI, persists conversations, and renders them in a virtualized list.

**Architecture:** Tool contract (`defineAiTool`, `defineCrudAiTools`, `dtoInput`, `@AiToolProvider`) lives in `@devloggers/backend-core`; domains register tool providers in their own modules; `AiToolRegistry` discovers them. Per request, the chat service builds a 3-node LangGraph (`agent → gate → tools`) with a Prisma checkpointer; the `gate` node calls `interrupt()` for `write`/`destructive` calls. Stream events are translated to AI SDK UI-message chunks with `createUIMessageStream`, piped over SSE, and the assembled `UIMessage` is persisted on finish.

**Tech Stack:** NestJS 11, Prisma 7, `@langchain/core` / `@langchain/langgraph` / `@langchain/openai` (v1 line), `ai` v6 (server stream helpers + client), `@ai-sdk/react` v3, `@tanstack/react-virtual`, Next.js 16 / React 19, next-intl.

**Spec:** `docs/superpowers/specs/2026-09-24-ai-agent-runtime-design.md` — read **"Plan-time revisions"** first; it overrides earlier spec sections.

## Global Constraints

- **No new automated tests** (user decision). Do not write `*.spec.ts` / `*.test.tsx`. Existing suites must stay green.
- **Commit once per task on branch `feat/ai-agent`** after its verification step passes (`git add` only the task's files; message `feat(ai-agent): <task title>` ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Never push. Never read or edit `.env` files.
- No `as any`, `as unknown as X`, `@ts-ignore`, `@ts-expect-error` on API data (`.ai/rules/code-quality.md` §4). Consume API types via `ApiResponse` / `ApiRequestBody` / `ApiQueryParams`.
- Every request DTO field: complete `@ApiProperty`/`@ApiPropertyOptional` with `type`; request DTO required fields use `!`, never initializers (`.ai/skills/backend-resource-module` DTO rule).
- `tenantId` / `userId` come only from the JWT (`@CurrentUser()`), never from a tool input schema.
- Tool names: dotted `domain-noun.verb` (e.g. `units.create`), must not contain `__`; model-facing names replace `.` with `__`.
- Tool risk: `read` executes immediately; `write` and `destructive` require approval.
- Never register a `delete` tool for: `invoices`, `payments`, `expenses`, `accounting`, `chart-of-accounts`, `stock-ledger`, `stock-counts` (cancel/reverse only — `.ai/rules/domain.md`).
- Limits: graph `recursionLimit` 25 · tool timeout 30 000 ms · tool output cap 8 000 chars · list `limit` ≤ 50 · chat rate limit 20 requests / user / minute · user message ≤ 8 000 chars.
- Audit: every executed `write`/`destructive` tool → `AuditWriter.record` with `source: 'AI_AGENT'`.
- Env: `AI_PROVIDER` (default `openai`), `AI_MODEL` (required at chat time), `OPENAI_API_KEY`. Remove `GEMINI_API_KEY`.
- i18n: `en`, `ar`, `tr` under `packages/i18n/src/<locale>/business.json`, namespace `business.aiAgent.*`. RTL: logical CSS only (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`).
- Library versions: install current releases; they must satisfy `ai@^6`, `@ai-sdk/react@^3`, `@langchain/core@^1`, `@langchain/langgraph@^1`, `@langchain/openai@^1`. If an installed major differs, stop and report — the stream/approval code below targets these majors.

---

## File structure

### `packages/backend-core/src/ai-tools/` (new — tool contract, infrastructure only)

| File | Responsibility |
|------|----------------|
| `ai-tool.types.ts` | `AiToolRisk`, `AiToolContext`, `JsonSchema`, `AiToolInput`, `AiTool`, `AiToolSource`, `AiToolResult` |
| `dto-json-schema.ts` | Swagger metadata on a DTO class → `JsonSchema` |
| `dto-input.ts` | `dtoInput(Dto, { omit })`, `withId(input)` — schema + class-validator validation |
| `ai-tool-dtos.ts` | `AiListQueryDto`, `AiIdDto` |
| `define-ai-tool.ts` | `defineAiTool()` → erased `AiTool` |
| `define-crud-ai-tools.ts` | `defineCrudAiTools()` factory |
| `ai-tool-provider.decorator.ts` | `@AiToolProvider()` + metadata key |
| `index.ts` | Barrel |

### `apps/api/src/modules/ai-agent/` (new — replaces `ai-chat/`)

| File | Responsibility |
|------|----------------|
| `ai-agent.module.ts` | Wiring |
| `tools/ai-tool-registry.ts` | Discover, validate at bootstrap, filter per user, search |
| `tools/ai-tool-executor.ts` | Permission re-check, timeout, cap, error mapping, audit |
| `tools/meta-tools.provider.ts` | `tools.search`, `tools.load` |
| `tools/tool-names.ts` | encode/decode model tool names, `NEVER_DELETE_RESOURCES`, `ALWAYS_LOADED_DOMAINS` |
| `runtime/model.factory.ts` | `ChatModelFactory` (OpenAI) |
| `runtime/agent-state.ts` | LangGraph state annotation + interrupt/resume types |
| `runtime/agent-graph.ts` | `buildAgentGraph()` — agent / gate / tools nodes |
| `runtime/system-prompt.ts` | System prompt |
| `runtime/prisma-checkpoint-saver.ts` | `BaseCheckpointSaver` on Prisma |
| `conversations/dto/conversation.dto.ts` | Conversation + message DTOs |
| `conversations/repositories/conversations.repository.ts` | Prisma access (conversations, messages, checkpoints delete) |
| `conversations/presenters/conversation.presenter.ts` | Entity → DTO |
| `conversations/services/conversations.service.ts` | Ownership, CRUD, pagination, message persistence |
| `conversations/controllers/conversations.controller.ts` | Non-stream routes |
| `chat/dto/chat-request.dto.ts` | Chat body |
| `chat/chat-rate-limiter.ts` | In-memory per-user limiter |
| `chat/ui-stream.translator.ts` | LangGraph stream → UI chunks |
| `chat/chat.service.ts` | Turn orchestration, approvals, persistence |
| `chat/chat.controller.ts` | `POST /ai/conversations/:id/chat` (SSE) + `GET /ai/model` |

### Pilot tool providers

| File | Tools |
|------|-------|
| `apps/api/src/modules/catalog/units/units.ai-tools.ts` | `units.list/show/create/update` |
| `apps/api/src/modules/catalog/items/items.ai-tools.ts` | `items.list/show/create/update` |
| `apps/api/src/modules/parties/parties.ai-tools.ts` | `customers.list/show/create/update` |

### Contracts / client / dashboard

| File | Responsibility |
|------|----------------|
| `packages/api-contracts/src/resources/ai.resource.ts` | Rewritten routes |
| `packages/api-client/src/clients/ai-agent.client.ts` | Client |
| `packages/api-client/src/infra/client.ts` | `resolveRequestTarget()` |
| `apps/dashboard/modules/ai-agent/**` | Chat UI (see Tasks 11–12) |
| `apps/dashboard/app/[locale]/(authenticated)/ai/page.tsx`, `ai/[conversationId]/page.tsx` | Thin routes |

---

### Task 1: Dependencies and AI configuration

**Files:**
- Modify: `apps/api/package.json` (via pnpm)
- Modify: `apps/api/src/config/configuration.ts:13-18`
- Modify: `apps/api/src/common/request-context/request-context.ts:5`

**Interfaces:**
- Produces: config keys `ai.provider: string`, `ai.model: string | undefined`, `ai.apiKey: string | undefined`; `AuditSource` includes `'AI_AGENT'`.

- [ ] **Step 1: Install API dependencies**

Run: `pnpm --filter @devloggers/api add @langchain/core @langchain/langgraph @langchain/openai ai`
Expected: installs; then run `pnpm --filter @devloggers/api list @langchain/core @langchain/langgraph @langchain/openai ai` and confirm majors `1.x, 1.x, 1.x, 6.x` (see Global Constraints).

- [ ] **Step 2: Replace the `ai` config block**

In `apps/api/src/config/configuration.ts` replace lines 13–18 with:

```ts
    ai: {
        // Provider + model are read per chat request; the API boots without them.
        provider: process.env.AI_PROVIDER || 'openai',
        model: process.env.AI_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
    },
```

- [ ] **Step 3: Add the audit source**

In `apps/api/src/common/request-context/request-context.ts` line 5:

```ts
export type AuditSource = 'HTTP' | 'GL' | 'SCHEDULER' | 'BUSINESS_SETUP' | 'SYSTEM' | 'AI_AGENT';
```

Also update the doc comment in `packages/db-prisma/src/schema/audit.prisma:17` to `/// HTTP | GL | SCHEDULER | BUSINESS_SETUP | SYSTEM | AI_AGENT — see RequestContext.AuditSource`.

- [ ] **Step 4: Tell the team about env vars**

Ask the user to add `AI_PROVIDER=openai`, `AI_MODEL=<their GPT model>`, `OPENAI_API_KEY=...` to `apps/api/.env*` and remove `GEMINI_API_KEY` (agents must not read or edit `.env` files — denied by `.claude/settings.json`). If an `.env.example` is tracked and readable by the user, they update it too.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json`
Expected: only errors originating in `src/modules/ai-chat/ai-chat.service.ts` (it reads `ai.apiKey` default Gemini model — deleted in Task 4). No other new errors.

---

### Task 2: Prisma schema and migration

**Files:**
- Delete: `packages/db-prisma/src/schema/ai-chat.prisma`
- Create: `packages/db-prisma/src/schema/ai-agent.prisma`
- Modify: `packages/db-prisma/src/schema/tenant.prisma:48`
- Create (generated): `packages/db-prisma/src/schema/migrations/<timestamp>_ai_agent/migration.sql`

**Interfaces:**
- Produces Prisma delegates: `prisma.aiConversation`, `prisma.aiMessage`, `prisma.aiCheckpoint`, `prisma.aiCheckpointWrite`; enum `AiMessageRole { USER ASSISTANT SYSTEM }`; compound ids `threadId_checkpointNs_checkpointId` and `threadId_checkpointNs_checkpointId_taskId_idx`.

- [ ] **Step 1: Delete `ai-chat.prisma`**

Delete the file `packages/db-prisma/src/schema/ai-chat.prisma` (plain file delete — no git commands; we do not commit).

- [ ] **Step 2: Create `ai-agent.prisma`**

```prisma
// ─── AI Agent ────────────────────────────────────────────────────────────────
// Display history (ai_conversations / ai_messages) is separate from the agent's
// working memory (ai_checkpoints / ai_checkpoint_writes, LangGraph checkpointer).

enum AiMessageRole {
    USER
    ASSISTANT
    SYSTEM
}

model AiConversation {
    id            String   @id @default(uuid())
    tenantId      String   @map("tenant_id")
    /// No FK — matches the previous ai-chat schema.
    userId        String   @map("user_id")
    title         String?
    lastMessageAt DateTime @default(now()) @map("last_message_at")
    createdAt     DateTime @default(now()) @map("created_at")
    updatedAt     DateTime @updatedAt @map("updated_at")

    tenant   Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    messages AiMessage[]

    @@index([tenantId, userId, lastMessageAt])
    @@map("ai_conversations")
}

model AiMessage {
    /// Client-generated for USER messages (AI SDK id), server-generated for ASSISTANT.
    id             String        @id @default(uuid())
    tenantId       String        @map("tenant_id")
    conversationId String        @map("conversation_id")
    role           AiMessageRole
    /// AI SDK UIMessage.parts, stored verbatim.
    parts          Json          @db.JsonB
    /// { model, finishReason, error }
    metadata       Json?         @db.JsonB
    createdAt      DateTime      @default(now()) @map("created_at")
    updatedAt      DateTime      @updatedAt @map("updated_at")

    tenant       Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

    @@index([conversationId, createdAt])
    @@map("ai_messages")
}

/// LangGraph checkpoint. thread_id = AiConversation.id. Payload is LangGraph serde (type + bytes).
model AiCheckpoint {
    threadId           String   @map("thread_id")
    checkpointNs       String   @default("") @map("checkpoint_ns")
    checkpointId       String   @map("checkpoint_id")
    parentCheckpointId String?  @map("parent_checkpoint_id")
    tenantId           String   @map("tenant_id")
    type               String
    checkpoint         Bytes
    metadata           Json     @db.JsonB
    createdAt          DateTime @default(now()) @map("created_at")

    @@id([threadId, checkpointNs, checkpointId])
    @@index([tenantId])
    @@map("ai_checkpoints")
}

/// LangGraph pending writes for a checkpoint.
model AiCheckpointWrite {
    threadId     String @map("thread_id")
    checkpointNs String @default("") @map("checkpoint_ns")
    checkpointId String @map("checkpoint_id")
    taskId       String @map("task_id")
    idx          Int
    channel      String
    type         String
    value        Bytes
    tenantId     String @map("tenant_id")

    @@id([threadId, checkpointNs, checkpointId, taskId, idx])
    @@index([tenantId])
    @@map("ai_checkpoint_writes")
}
```

- [ ] **Step 3: Update the `Tenant` relations**

In `packages/db-prisma/src/schema/tenant.prisma` replace line 48 `aiChatSessions    AiChatSession[]` with:

```prisma
    aiConversations   AiConversation[]
    aiMessages        AiMessage[]
```

- [ ] **Step 4: Validate and create the migration**

Run: `pnpm --filter @devloggers/db-prisma exec prisma validate --schema=src/schema`
Expected: `The schemas at src/schema are valid`.

Run: `pnpm --filter @devloggers/db-prisma db:migrate:dev -- --name ai_agent`
Expected: a new `migrations/<timestamp>_ai_agent/migration.sql` containing `DROP TABLE "ai_chat_messages"`, `DROP TABLE "ai_chat_sessions"`, `DROP TYPE "MessageRole"`, and `CREATE TABLE` for the four new tables; client regenerated.

If it fails on an advisory lock / shared DB (known issue on this team's DB), rerun with `-- --name ai_agent --create-only`, report to the user that the migration must be applied later, and continue — Prisma client generation still works: `pnpm --filter @devloggers/db-prisma db:generate`.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/db-prisma typecheck`
Expected: exit 0.

---

### Task 3: Tool contract in backend-core

**Files:**
- Create: `packages/backend-core/src/ai-tools/ai-tool.types.ts`
- Create: `packages/backend-core/src/ai-tools/dto-json-schema.ts`
- Create: `packages/backend-core/src/ai-tools/dto-input.ts`
- Create: `packages/backend-core/src/ai-tools/ai-tool-dtos.ts`
- Create: `packages/backend-core/src/ai-tools/define-ai-tool.ts`
- Create: `packages/backend-core/src/ai-tools/define-crud-ai-tools.ts`
- Create: `packages/backend-core/src/ai-tools/ai-tool-provider.decorator.ts`
- Create: `packages/backend-core/src/ai-tools/index.ts`
- Modify: `packages/backend-core/src/index.ts` (add export)

**Interfaces:**
- Consumes: `ICrudService` (`base/crud-service`), `buildPrismaWhere`, `resolvePagination`, `ApiQueryOptionsDto`, `FilterSchema` (`api/*`), `PermissionKey` (`@devloggers/api-contracts`).
- Produces (all exported from `@devloggers/backend-core`):
  - `type AiToolRisk = 'read' | 'write' | 'destructive'`
  - `interface AiToolContext { tenantId; userId; permissions: ReadonlySet<string>; locale; conversationId }`
  - `type JsonSchema`
  - `interface AiTool { name; domain; resource?; description; risk; permission: PermissionKey; enabled: boolean; jsonSchema: JsonSchema; prepare(raw: unknown): Promise<AiToolPrepared> }`
  - `type AiToolPrepared = { ok: true; run(ctx: AiToolContext): Promise<unknown> } | { ok: false; errors: Record<string, string[]> }`
  - `interface AiToolSource { aiTools(): readonly AiTool[] }`
  - `type AiToolResult = { kind: 'output'; output: unknown } | { kind: 'error'; errorText: string; details?: unknown } | { kind: 'denied'; reason: string }`
  - `defineAiTool<I, O>(def: AiToolDefinition<I, O>): AiTool`
  - `defineCrudAiTools<TResponse, TCreate, TUpdate>(config: CrudAiToolsConfig<...>): AiTool[]`
  - `dtoInput<T>(dto, options?)`, `withId<T>(input)`, `dtoJsonSchema(dto)`
  - `AiToolProvider(): ClassDecorator`, `AI_TOOL_PROVIDER_METADATA: string`
  - `AiListQueryDto`, `AiIdDto`

- [ ] **Step 1: Types — `ai-tool.types.ts`**

```ts
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
```

- [ ] **Step 2: Swagger metadata → JSON schema — `dto-json-schema.ts`**

```ts
import 'reflect-metadata';
import type { JsonSchema } from './ai-tool.types';

/** Metadata keys written by @nestjs/swagger's @ApiProperty (stable since v4). */
const PROPERTIES_ARRAY = 'swagger/apiModelPropertiesArray';
const PROPERTY = 'swagger/apiModelProperties';

export type DtoClass<T extends object = object> = new () => T;

interface SwaggerPropertyMeta {
  type?: unknown;
  required?: boolean;
  isArray?: boolean;
  enum?: unknown;
  nullable?: boolean;
  description?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
}

function readMeta<T>(key: string, target: object, property?: string): T | undefined {
  const value: unknown =
    property === undefined ? Reflect.getMetadata(key, target) : Reflect.getMetadata(key, target, property);
  return value as T | undefined;
}

function isDtoClass(value: unknown): value is DtoClass {
  return (
    typeof value === 'function' &&
    value.prototype !== undefined &&
    readMeta<string[]>(PROPERTIES_ARRAY, value.prototype as object) !== undefined
  );
}

/** `type: () => Dto` is a lazy reference: an arrow function has no prototype. */
function resolveType(type: unknown): unknown {
  if (typeof type === 'function' && type.prototype === undefined) {
    return (type as () => unknown)();
  }
  return type;
}

function enumValues(enumLike: unknown): (string | number)[] {
  if (Array.isArray(enumLike)) return enumLike.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
  if (enumLike && typeof enumLike === 'object') {
    const values = Object.values(enumLike as Record<string, string | number>);
    const numbers = values.filter((v): v is number => typeof v === 'number');
    // Numeric TS enums carry a reverse mapping; keep only the numeric values then.
    return numbers.length > 0 ? numbers : values;
  }
  return [];
}

function primitiveSchema(type: unknown): JsonSchema | undefined {
  if (type === String || type === 'string') return { type: 'string' };
  if (type === Number || type === 'number') return { type: 'number' };
  if (type === 'integer') return { type: 'integer' };
  if (type === Boolean || type === 'boolean') return { type: 'boolean' };
  if (type === Date) return { type: 'string', format: 'date-time' };
  if (type === Object || type === 'object') return { type: 'object' };
  return undefined;
}

/**
 * Converts a DTO class's @ApiProperty metadata into a JSON schema for an LLM tool.
 * The repo mandates complete Swagger decorators on every DTO field (.ai/rules/api.md),
 * so this is the same contract the OpenAPI generator sees.
 */
export function dtoJsonSchema(dto: DtoClass, seen: ReadonlySet<DtoClass> = new Set()): JsonSchema {
  if (seen.has(dto)) {
    throw new Error(`DTO "${dto.name}" is recursive and cannot be used as an AI tool input`);
  }
  const nextSeen = new Set(seen).add(dto);
  const prototype = dto.prototype as object;
  const keys = (readMeta<string[]>(PROPERTIES_ARRAY, prototype) ?? []).map((key) => key.replace(/^:/, ''));

  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const key of keys) {
    const meta = readMeta<SwaggerPropertyMeta>(PROPERTY, prototype, key) ?? {};
    const rawType = resolveType(meta.type ?? readMeta<unknown>('design:type', prototype, key));

    let schema: JsonSchema;
    if (meta.enum !== undefined) {
      const values = enumValues(meta.enum);
      schema = { type: typeof values[0] === 'number' ? 'number' : 'string', enum: values };
    } else if (isDtoClass(rawType)) {
      schema = dtoJsonSchema(rawType, nextSeen);
    } else {
      schema = primitiveSchema(rawType) ?? {};
    }

    if (meta.isArray || rawType === Array) {
      schema = { type: 'array', items: rawType === Array ? {} : schema };
    }
    if (meta.nullable && typeof schema.type === 'string') {
      schema = { ...schema, type: [schema.type, 'null'] };
    }
    if (meta.description) schema = { ...schema, description: meta.description };
    if (meta.format && !schema.format) schema = { ...schema, format: meta.format };
    if (meta.minimum !== undefined) schema = { ...schema, minimum: meta.minimum };
    if (meta.maximum !== undefined) schema = { ...schema, maximum: meta.maximum };

    properties[key] = schema;
    if (meta.required !== false) required.push(key);
  }

  return { type: 'object', properties, required, additionalProperties: false };
}
```

- [ ] **Step 3: Validation — `dto-input.ts`**

```ts
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { AiToolInput, AiToolValidation, JsonSchema } from './ai-tool.types';
import { dtoJsonSchema, type DtoClass } from './dto-json-schema';

function flattenErrors(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) out[path] = Object.values(error.constraints);
    if (error.children?.length) Object.assign(out, flattenErrors(error.children, path));
  }
  return out;
}

function omitProperties(schema: JsonSchema, omit: readonly string[]): JsonSchema {
  if (omit.length === 0) return schema;
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([key]) => !omit.includes(key)),
  );
  return { ...schema, properties, required: (schema.required ?? []).filter((key) => !omit.includes(key)) };
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/**
 * Tool input backed by a class-validator DTO — same semantics as the global
 * ValidationPipe (whitelist + forbidNonWhitelisted + implicit conversion).
 * `omit` removes fields the model must not set (the handler supplies them).
 */
export function dtoInput<T extends object>(
  dto: DtoClass<T>,
  options: { omit?: readonly string[] } = {},
): AiToolInput<T> {
  const omit = options.omit ?? [];
  return {
    jsonSchema: omitProperties(dtoJsonSchema(dto), omit),
    async validate(raw): Promise<AiToolValidation<T>> {
      const body = asRecord(raw);
      const forbidden = omit.filter((key) => key in body);
      if (forbidden.length > 0) {
        return { ok: false, errors: Object.fromEntries(forbidden.map((key) => [key, [`${key} cannot be set by the assistant`]])) };
      }
      const instance = plainToInstance(dto, body, { enableImplicitConversion: true });
      const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
      return errors.length > 0 ? { ok: false, errors: flattenErrors(errors) } : { ok: true, value: instance };
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adds a required `id` (UUID) to another input: `{ id, ...rest }` → `{ id, value: rest }`. */
export function withId<T>(input: AiToolInput<T>): AiToolInput<{ id: string; value: T }> {
  return {
    jsonSchema: {
      ...input.jsonSchema,
      properties: { id: { type: 'string', format: 'uuid', description: 'Record UUID' }, ...input.jsonSchema.properties },
      required: ['id', ...(input.jsonSchema.required ?? [])],
    },
    async validate(raw) {
      const { id, ...rest } = asRecord(raw);
      if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, errors: { id: ['id must be a UUID'] } };
      const result = await input.validate(rest);
      return result.ok ? { ok: true, value: { id, value: result.value } } : result;
    },
  };
}
```

- [ ] **Step 4: Shared input DTOs — `ai-tool-dtos.ts`**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AiListQueryDto {
  @ApiPropertyOptional({ type: 'string', description: 'Free-text search keyword' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, description: 'Page number, starting at 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, description: 'Rows per page (max 50, default 20)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class AiIdDto {
  @ApiProperty({ type: 'string', format: 'uuid', description: 'Record UUID' })
  @IsUUID()
  id!: string;
}
```

- [ ] **Step 5: `define-ai-tool.ts`**

```ts
import type { AiTool, AiToolDefinition } from './ai-tool.types';

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
```

- [ ] **Step 6: CRUD factory — `define-crud-ai-tools.ts`**

```ts
import { NotFoundException } from '@nestjs/common';
import type { PermissionKey } from '@devloggers/api-contracts';
import { ApiQueryOptionsDto } from '../api/api-query-options.dto';
import { buildPrismaWhere, resolvePagination } from '../api/api-query.utils';
import type { FilterSchema } from '../api/filter-schema';
import type { ICrudService } from '../base/crud-service';
import type { AiTool } from './ai-tool.types';
import { AiIdDto, AiListQueryDto } from './ai-tool-dtos';
import { defineAiTool } from './define-ai-tool';
import { dtoInput, withId } from './dto-input';
import type { DtoClass } from './dto-json-schema';

export type CrudAiOp = 'list' | 'show' | 'create' | 'update' | 'delete';

export interface CrudAiToolsConfig<TResponse, TCreate extends object, TUpdate extends object> {
  /** Tool-name prefix, e.g. `units` → `units.list`. */
  readonly prefix: string;
  /** api-contracts resource key the tools act on. */
  readonly resource: string;
  readonly domain: string;
  /** Human noun for descriptions, e.g. "unit of measure". */
  readonly label: string;
  readonly service: ICrudService<TResponse, TCreate, TUpdate>;
  readonly createDto: DtoClass<TCreate>;
  readonly updateDto: DtoClass<TUpdate>;
  /** Same filter schema as the HTTP controller (search on localized fields needs it). */
  readonly filterSchema: FilterSchema;
  readonly searchFields: readonly string[];
  readonly permissions: {
    readonly view: PermissionKey;
    readonly create: PermissionKey;
    readonly update: PermissionKey;
    readonly delete?: PermissionKey;
  };
  /** Default `['list','show','create','update']`. `delete` is opt-in and becomes `destructive`. */
  readonly ops?: readonly CrudAiOp[];
  /** Narrows the tools to a subset of the resource (e.g. customers within parties). */
  readonly scope?: {
    readonly listWhere?: Record<string, unknown>;
    readonly createDefaults?: Partial<TCreate>;
    readonly omitInputFields?: readonly string[];
    readonly isInScope?: (item: TResponse) => boolean;
  };
}

const DEFAULT_OPS: readonly CrudAiOp[] = ['list', 'show', 'create', 'update'];
const DEFAULT_LIMIT = 20;

export function defineCrudAiTools<TResponse, TCreate extends object, TUpdate extends object>(
  config: CrudAiToolsConfig<TResponse, TCreate, TUpdate>,
): AiTool[] {
  const { prefix, resource, domain, label, service, permissions, scope = {} } = config;
  const ops = config.ops ?? DEFAULT_OPS;
  const omit = scope.omitInputFields ?? [];

  const findInScope = async (tenantId: string, id: string): Promise<TResponse> => {
    const item = await service.findById(tenantId, id);
    if (scope.isInScope && !scope.isInScope(item)) {
      throw new NotFoundException(`${label} with id '${id}' not found`);
    }
    return item;
  };

  const tools: AiTool[] = [];

  if (ops.includes('list')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.list`,
        domain,
        resource,
        risk: 'read',
        permission: permissions.view,
        description:
          `List ${label} records, newest first. Optional free-text "search" matches ${config.searchFields.join(', ')}. ` +
          `Returns { items, total, page }; at most 50 items per page.`,
        input: dtoInput(AiListQueryDto),
        handler: async (ctx, input) => {
          const query = Object.assign(new ApiQueryOptionsDto(), {
            page: input.page ?? 1,
            limit: input.limit ?? DEFAULT_LIMIT,
            search: input.search,
            searchIn: input.search ? config.searchFields.join(',') : undefined,
          });
          const { skip, limit, page } = resolvePagination(query);
          const where = { ...buildPrismaWhere(query, config.filterSchema), ...scope.listWhere };
          const result = await service.list(ctx.tenantId, { skip, take: limit, where, orderBy: { createdAt: 'desc' } });
          return { items: result.data, total: result.total, page };
        },
      }),
    );
  }

  if (ops.includes('show')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.show`,
        domain,
        resource,
        risk: 'read',
        permission: permissions.view,
        description: `Get one ${label} by its UUID.`,
        input: dtoInput(AiIdDto),
        handler: (ctx, input) => findInScope(ctx.tenantId, input.id),
      }),
    );
  }

  if (ops.includes('create')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.create`,
        domain,
        resource,
        risk: 'write',
        permission: permissions.create,
        description: `Create a ${label}. The user must approve before it runs.`,
        input: dtoInput(config.createDto, { omit }),
        handler: (ctx, input) => service.create(ctx.tenantId, Object.assign(input, scope.createDefaults ?? {})),
      }),
    );
  }

  if (ops.includes('update')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.update`,
        domain,
        resource,
        risk: 'write',
        permission: permissions.update,
        description: `Update a ${label} by UUID. Send only the fields to change. The user must approve before it runs.`,
        input: withId(dtoInput(config.updateDto, { omit })),
        handler: async (ctx, input) => {
          await findInScope(ctx.tenantId, input.id);
          return service.update(ctx.tenantId, input.id, input.value);
        },
      }),
    );
  }

  if (ops.includes('delete')) {
    if (!permissions.delete) throw new Error(`${prefix}.delete requires permissions.delete`);
    const deletePermission = permissions.delete;
    tools.push(
      defineAiTool({
        name: `${prefix}.delete`,
        domain,
        resource,
        risk: 'destructive',
        permission: deletePermission,
        description: `Permanently delete a ${label} by UUID. The user must approve before it runs.`,
        input: dtoInput(AiIdDto),
        handler: async (ctx, input) => {
          await findInScope(ctx.tenantId, input.id);
          await service.delete(ctx.tenantId, input.id);
          return { id: input.id, deleted: true };
        },
      }),
    );
  }

  return tools;
}
```

Note: `resolvePagination` returns `{ page, limit, skip }` (see `api-query.utils.ts:66`). If `service.list`'s options parameter is typed narrower than `Record<string, any>` for a service, it still accepts this object (the base `ICrudService.list` takes `Record<string, any>`).

- [ ] **Step 7: Decorator — `ai-tool-provider.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';

export const AI_TOOL_PROVIDER_METADATA = 'devloggers:ai-tool-provider';

/**
 * Marks an injectable class implementing `AiToolSource` so the ai-agent
 * registry discovers it. Register the class in the owning domain's module;
 * when that domain is disabled its tools disappear with it.
 */
export const AiToolProvider = (): ClassDecorator => SetMetadata(AI_TOOL_PROVIDER_METADATA, true);
```

- [ ] **Step 8: Barrels**

`packages/backend-core/src/ai-tools/index.ts`:

```ts
export * from './ai-tool.types';
export * from './ai-tool-dtos';
export * from './ai-tool-provider.decorator';
export * from './define-ai-tool';
export * from './define-crud-ai-tools';
export * from './dto-input';
export { dtoJsonSchema, type DtoClass } from './dto-json-schema';
```

Match the import-specifier style of neighbouring backend-core files: if sibling files import with `.js` suffixes (e.g. `api/index.ts` uses `'./api-response.js'`), add `.js` to every relative import in the new files.

Append to `packages/backend-core/src/index.ts`:

```ts
export * from './ai-tools';
```

(Use `'./ai-tools/index.js'` if the file's other lines use `.js` specifiers.)

- [ ] **Step 9: Verify**

Run: `pnpm --filter @devloggers/backend-core build`
Expected: exit 0.

---

### Task 4: Replace the `ai-chat` domain with `ai-agent` (domain wiring + conversations routes)

**Files:**
- Delete: `apps/api/src/modules/ai-chat/` (whole folder)
- Create: `apps/api/src/modules/ai-agent/ai-agent.module.ts`
- Create: `apps/api/src/modules/ai-agent/index.ts`
- Create: `apps/api/src/modules/ai-agent/conversations/dto/conversation.dto.ts`
- Create: `apps/api/src/modules/ai-agent/conversations/repositories/conversations.repository.ts`
- Create: `apps/api/src/modules/ai-agent/conversations/presenters/conversation.presenter.ts`
- Create: `apps/api/src/modules/ai-agent/conversations/services/conversations.service.ts`
- Create: `apps/api/src/modules/ai-agent/conversations/controllers/conversations.controller.ts`
- Modify: `apps/api/src/domain/manifest.ts:22,72-78`
- Modify: `apps/api/src/domain/domain-modules.ts:3,31`
- Modify: `apps/api/src/domain/manifest.spec.ts:58`
- Modify: `apps/api/eslint/domain-boundaries.mjs:131`
- Modify: `apps/api/src/modules/identity/auth/guards/index.ts`
- Modify: `.ai/rules/api.md` (domain table)

**Interfaces:**
- Consumes: Prisma delegates from Task 2.
- Produces:
  - `ConversationsService.getOwned(tenantId, userId, id): Promise<AiConversation>` (404 otherwise)
  - `ConversationsService.saveUserMessage(conv: AiConversation, message: { id: string; text: string }): Promise<void>`
  - `ConversationsService.findLastAssistantMessage(conversationId): Promise<StoredUiMessage | null>`
  - `ConversationsService.upsertAssistantMessage(conv, message: StoredUiMessage, metadata?: Record<string, unknown>): Promise<void>`
  - `type StoredUiMessage = { id: string; role: 'user' | 'assistant' | 'system'; parts: Record<string, unknown>[] }`
  - Guards barrel also exports `PermissionResolverService`.

- [ ] **Step 1: Delete the old domain**

Delete `apps/api/src/modules/ai-chat/` entirely.

- [ ] **Step 2: Manifest**

In `apps/api/src/domain/manifest.ts`: replace `| 'ai-chat'` (line 22) with `| 'ai-agent'`, and replace the `ai-chat` entry (lines 72–78) with:

```ts
    {
        key: 'ai-agent',
        dependsOn: ['audit'],
        provides: [],
        routes: ['ai'],
        optional: true,
    },
```

Keep the array alphabetically ordered as it is (`accounting`, `ai-agent`, `audit`, …).

In `apps/api/src/domain/manifest.spec.ts:58` replace `'files, ai-chat'` and `['files', 'ai-chat']` with `'files, ai-agent'` and `['files', 'ai-agent']`.

- [ ] **Step 3: Domain modules**

In `apps/api/src/domain/domain-modules.ts` replace line 3 with `import { AiAgentModule } from '../modules/ai-agent/ai-agent.module';` and line 31 with `    'ai-agent': [AiAgentModule],`.

- [ ] **Step 4: Boundaries**

In `apps/api/eslint/domain-boundaries.mjs:131` replace with:

```js
    'ai-agent': barrelOnly('ai-agent', 'nothing yet — ai-agent is a leaf'),
```

- [ ] **Step 5: Publish `PermissionResolverService` through the identity auth kernel**

`apps/api/src/modules/identity/auth/guards/index.ts`:

```ts
export { JwtAuthGuard } from './jwt-auth.guard';
export { PermissionsGuard } from './permissions.guard';
// The ai-agent filters tools by the same resolved permissions the guard uses.
export { PermissionResolverService } from '../permissions/permission-resolver.service';
```

(`PermissionsModule` is `@Global`, so no module import is needed.)

- [ ] **Step 6: DTOs — `conversations/dto/conversation.dto.ts`**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum AiMessageRoleEnum {
    USER = 'USER',
    ASSISTANT = 'ASSISTANT',
    SYSTEM = 'SYSTEM',
}

export class CreateConversationDto {
    @ApiPropertyOptional({ type: 'string', example: 'Stock cleanup', description: 'Optional title; defaults to the first message' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;
}

export class UpdateConversationDto {
    @ApiProperty({ type: 'string', example: 'Stock cleanup' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title!: string;
}

export class CursorPageQueryDto {
    @ApiPropertyOptional({ type: 'string', description: 'Id of the last row of the previous page' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number;
}

export class ConversationResponseDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a001-000000000001' })
    id: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: 'Stock cleanup' })
    title: string | null = null;

    @ApiProperty({ type: 'string', example: '2026-09-24T10:00:00.000Z' })
    lastMessageAt: string = '';

    @ApiProperty({ type: 'string', example: '2026-09-24T10:00:00.000Z' })
    createdAt: string = '';
}

export class ConversationPageDto {
    @ApiProperty({ type: () => ConversationResponseDto, isArray: true })
    items: ConversationResponseDto[] = [];

    @ApiProperty({ type: 'string', nullable: true })
    nextCursor: string | null = null;
}

export class AiMessageResponseDto {
    @ApiProperty({ type: 'string' })
    id: string = '';

    @ApiProperty({ enum: AiMessageRoleEnum, enumName: 'AiMessageRoleEnum' })
    role: AiMessageRoleEnum = AiMessageRoleEnum.USER;

    @ApiProperty({
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'AI SDK UIMessage parts, verbatim',
    })
    parts: Record<string, unknown>[] = [];

    @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
    metadata: Record<string, unknown> | null = null;

    @ApiProperty({ type: 'string', example: '2026-09-24T10:00:00.000Z' })
    createdAt: string = '';
}

export class AiMessagePageDto {
    @ApiProperty({ type: () => AiMessageResponseDto, isArray: true, description: 'Newest first' })
    items: AiMessageResponseDto[] = [];

    @ApiProperty({ type: 'string', nullable: true })
    nextCursor: string | null = null;
}

export class AiModelResponseDto {
    @ApiProperty({ type: 'string', example: 'openai' })
    provider: string = '';

    @ApiProperty({ type: 'string', nullable: true, example: null })
    model: string | null = null;
}
```

- [ ] **Step 7: Repository — `conversations/repositories/conversations.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { AiConversation, AiMessage, AiMessageRole, Prisma } from '@devloggers/db-prisma';

@Injectable()
export class ConversationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findOwned(tenantId: string, userId: string, id: string): Promise<AiConversation | null> {
        return this.prisma.aiConversation.findFirst({ where: { id, tenantId, userId } });
    }

    listPage(tenantId: string, userId: string, take: number, cursor?: string): Promise<AiConversation[]> {
        return this.prisma.aiConversation.findMany({
            where: { tenantId, userId },
            orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
            take,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
    }

    create(tenantId: string, userId: string, title: string | null): Promise<AiConversation> {
        return this.prisma.aiConversation.create({ data: { tenantId, userId, title } });
    }

    update(id: string, data: Prisma.AiConversationUpdateInput): Promise<AiConversation> {
        return this.prisma.aiConversation.update({ where: { id }, data });
    }

    /** Messages cascade by FK; checkpoints have no FK (LangGraph owns their shape). */
    async deleteWithCheckpoints(id: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.aiCheckpointWrite.deleteMany({ where: { threadId: id } }),
            this.prisma.aiCheckpoint.deleteMany({ where: { threadId: id } }),
            this.prisma.aiConversation.delete({ where: { id } }),
        ]);
    }

    messagesPage(conversationId: string, take: number, cursor?: string): Promise<AiMessage[]> {
        return this.prisma.aiMessage.findMany({
            where: { conversationId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
    }

    findLastAssistant(conversationId: string): Promise<AiMessage | null> {
        return this.prisma.aiMessage.findFirst({
            where: { conversationId, role: 'ASSISTANT' },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    }

    createMessage(data: {
        id: string;
        tenantId: string;
        conversationId: string;
        role: AiMessageRole;
        parts: Prisma.InputJsonValue;
    }): Promise<AiMessage> {
        return this.prisma.aiMessage.create({ data });
    }

    upsertMessage(data: {
        id: string;
        tenantId: string;
        conversationId: string;
        role: AiMessageRole;
        parts: Prisma.InputJsonValue;
        metadata?: Prisma.InputJsonValue;
    }): Promise<AiMessage> {
        const { id, parts, metadata } = data;
        return this.prisma.aiMessage.upsert({
            where: { id },
            create: data,
            update: { parts, ...(metadata !== undefined ? { metadata } : {}) },
        });
    }
}
```

- [ ] **Step 8: Presenter — `conversations/presenters/conversation.presenter.ts`**

```ts
import { Injectable } from '@nestjs/common';
import type { AiConversation, AiMessage } from '@devloggers/db-prisma';
import { AiMessageResponseDto, AiMessageRoleEnum, ConversationResponseDto } from '../dto/conversation.dto';

function asPartArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter((part): part is Record<string, unknown> => part !== null && typeof part === 'object')
        : [];
}

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

@Injectable()
export class ConversationPresenter {
    toConversation(entity: AiConversation): ConversationResponseDto {
        return {
            id: entity.id,
            title: entity.title,
            lastMessageAt: entity.lastMessageAt.toISOString(),
            createdAt: entity.createdAt.toISOString(),
        };
    }

    toMessage(entity: AiMessage): AiMessageResponseDto {
        return {
            id: entity.id,
            role: AiMessageRoleEnum[entity.role],
            parts: asPartArray(entity.parts),
            metadata: asRecordOrNull(entity.metadata),
            createdAt: entity.createdAt.toISOString(),
        };
    }
}
```

- [ ] **Step 9: Service — `conversations/services/conversations.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AiConversation, Prisma } from '@devloggers/db-prisma';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationPresenter } from '../presenters/conversation.presenter';
import type {
    AiMessagePageDto,
    ConversationPageDto,
    ConversationResponseDto,
    CreateConversationDto,
    CursorPageQueryDto,
    UpdateConversationDto,
} from '../dto/conversation.dto';

export type StoredUiMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    parts: Record<string, unknown>[];
};

const DEFAULT_PAGE = 20;
const TITLE_LENGTH = 60;

/** JSON round-trip: UIMessage parts are plain data; this yields a Prisma JSON value without casts on API data. */
function toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class ConversationsService {
    constructor(
        private readonly repository: ConversationsRepository,
        private readonly presenter: ConversationPresenter,
    ) {}

    async getOwned(tenantId: string, userId: string, id: string): Promise<AiConversation> {
        const conversation = await this.repository.findOwned(tenantId, userId, id);
        if (!conversation) throw new NotFoundException('Conversation not found');
        return conversation;
    }

    async list(tenantId: string, userId: string, query: CursorPageQueryDto): Promise<ConversationPageDto> {
        const limit = query.limit ?? DEFAULT_PAGE;
        const rows = await this.repository.listPage(tenantId, userId, limit + 1, query.cursor);
        const page = rows.slice(0, limit);
        return {
            items: page.map((row) => this.presenter.toConversation(row)),
            nextCursor: rows.length > limit ? page[page.length - 1].id : null,
        };
    }

    async create(tenantId: string, userId: string, dto: CreateConversationDto): Promise<ConversationResponseDto> {
        const created = await this.repository.create(tenantId, userId, dto.title?.trim() || null);
        return this.presenter.toConversation(created);
    }

    async rename(tenantId: string, userId: string, id: string, dto: UpdateConversationDto): Promise<ConversationResponseDto> {
        await this.getOwned(tenantId, userId, id);
        return this.presenter.toConversation(await this.repository.update(id, { title: dto.title.trim() }));
    }

    async delete(tenantId: string, userId: string, id: string): Promise<void> {
        await this.getOwned(tenantId, userId, id);
        await this.repository.deleteWithCheckpoints(id);
    }

    async messages(tenantId: string, userId: string, id: string, query: CursorPageQueryDto): Promise<AiMessagePageDto> {
        await this.getOwned(tenantId, userId, id);
        const limit = query.limit ?? DEFAULT_PAGE;
        const rows = await this.repository.messagesPage(id, limit + 1, query.cursor);
        const page = rows.slice(0, limit);
        return {
            items: page.map((row) => this.presenter.toMessage(row)),
            nextCursor: rows.length > limit ? page[page.length - 1].id : null,
        };
    }

    async saveUserMessage(conversation: AiConversation, message: { id: string; text: string }): Promise<void> {
        await this.repository.createMessage({
            id: message.id,
            tenantId: conversation.tenantId,
            conversationId: conversation.id,
            role: 'USER',
            parts: toJson([{ type: 'text', text: message.text }]),
        });
        await this.repository.update(conversation.id, {
            lastMessageAt: new Date(),
            ...(conversation.title ? {} : { title: message.text.trim().slice(0, TITLE_LENGTH) }),
        });
    }

    async findLastAssistantMessage(conversationId: string): Promise<StoredUiMessage | null> {
        const row = await this.repository.findLastAssistant(conversationId);
        if (!row) return null;
        const dto = this.presenter.toMessage(row);
        return { id: dto.id, role: 'assistant', parts: dto.parts };
    }

    async upsertAssistantMessage(
        conversation: AiConversation,
        message: StoredUiMessage,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.repository.upsertMessage({
            id: message.id,
            tenantId: conversation.tenantId,
            conversationId: conversation.id,
            role: 'ASSISTANT',
            parts: toJson(message.parts),
            ...(metadata ? { metadata: toJson(metadata) } : {}),
        });
        await this.repository.update(conversation.id, { lastMessageAt: new Date() });
    }
}
```

- [ ] **Step 10: Controller — `conversations/controllers/conversations.controller.ts`**

```ts
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '../../../identity/auth/guards';
import { CurrentUser, type RequestUser } from '../../../identity/auth/decorators';
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
```

If `RequestUser` is exported as a value (class) from the decorators barrel, drop the `type` modifier to match `auth.controller.ts:16` (`import { CurrentUser, RequestUser } from './decorators'`).

- [ ] **Step 11: Module + barrel**

`apps/api/src/modules/ai-agent/ai-agent.module.ts` (extended in Tasks 5–8):

```ts
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
```

`apps/api/src/modules/ai-agent/index.ts`:

```ts
/** Public API of the ai-agent domain. Nothing is exported yet — ai-agent is a leaf. */
export {};
```

- [ ] **Step 12: Rules doc**

In `.ai/rules/api.md` domain table, rename the `ai-chat` mention in the "`parties`, `reports`, `files`, `audit`, `ai-chat`" row to `ai-agent`, and add a sentence under the table: "`ai-agent` discovers tools via `@AiToolProvider()` classes registered in each domain's own module (contract in `@devloggers/backend-core`), so it has no import edges to the domains whose tools it runs." Also add `PermissionResolverService` to the `identity` row's Exposes column.

- [ ] **Step 13: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json`
Expected: exit 0.
Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All N architecture-rule cases passed.` and the manifest check passes. If the manifest check reports a `routes` mismatch, ensure only controllers under `ai/…` exist in `ai-agent`.

---

### Task 5: Tool registry, executor and meta-tools

**Files:**
- Create: `apps/api/src/modules/ai-agent/tools/tool-names.ts`
- Create: `apps/api/src/modules/ai-agent/tools/ai-tool-registry.ts`
- Create: `apps/api/src/modules/ai-agent/tools/ai-tool-executor.ts`
- Create: `apps/api/src/modules/ai-agent/tools/meta-tools.provider.ts`
- Modify: `apps/api/src/modules/ai-agent/ai-agent.module.ts`

**Interfaces:**
- Consumes: `AiTool`, `AiToolSource`, `AiToolContext`, `AiToolResult`, `AI_TOOL_PROVIDER_METADATA`, `defineAiTool`, `dtoInput` (Task 3); `AuditWriter` from `../audit` barrel; `domainKeys()` from `src/domain/manifest`.
- Produces:
  - `toModelToolName(name: string): string`, `fromModelToolName(name: string): string`
  - `ALWAYS_LOADED_DOMAINS: ReadonlySet<string>`, `NEVER_DELETE_RESOURCES: ReadonlySet<string>`
  - `AiToolRegistry.forUser(ctx: AiToolContext, loadedDomains: readonly string[]): AiTool[]`
  - `AiToolRegistry.find(ctx: AiToolContext, name: string): AiTool | undefined`
  - `AiToolRegistry.search(ctx, query: string): { name: string; domain: string; description: string; risk: AiToolRisk }[]`
  - `AiToolRegistry.availableDomains(ctx): string[]`
  - `AiToolExecutor.execute(ctx, tool: AiTool, rawInput: unknown, toolCallId: string): Promise<AiToolResult>`
  - Tool `tools.load` output shape: `{ loadedDomain: string }`

- [ ] **Step 1: `tools/tool-names.ts`**

```ts
/** OpenAI function names must match ^[a-zA-Z0-9_-]+$; registry names are dotted. */
export function toModelToolName(name: string): string {
    return name.replace(/\./g, '__');
}

export function fromModelToolName(name: string): string {
    return name.replace(/__/g, '.');
}

/** Tools of these domains are always offered; others are pulled in by `tools.load`. */
export const ALWAYS_LOADED_DOMAINS: ReadonlySet<string> = new Set(['ai-agent', 'catalog', 'parties']);

/** Financial documents and ledgers are cancelled or reversed, never deleted (.ai/rules/domain.md). */
export const NEVER_DELETE_RESOURCES: ReadonlySet<string> = new Set([
    'invoices',
    'payments',
    'expenses',
    'accounting',
    'chart-of-accounts',
    'stock-ledger',
    'stock-counts',
]);

export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-zA-Z0-9-]*$/;
```

- [ ] **Step 2: `tools/ai-tool-registry.ts`**

```ts
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { AI_TOOL_PROVIDER_METADATA, type AiTool, type AiToolContext, type AiToolRisk, type AiToolSource } from '@devloggers/backend-core';
import { domainKeys } from '../../../domain/manifest';
import { ALWAYS_LOADED_DOMAINS, NEVER_DELETE_RESOURCES, TOOL_NAME_PATTERN } from './tool-names';

function isToolSource(instance: unknown): instance is AiToolSource {
    return instance !== null && typeof instance === 'object' && typeof (instance as { aiTools?: unknown }).aiTools === 'function';
}

@Injectable()
export class AiToolRegistry implements OnApplicationBootstrap {
    private readonly logger = new Logger(AiToolRegistry.name);
    private readonly tools = new Map<string, AiTool>();

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly reflector: Reflector,
    ) {}

    onApplicationBootstrap(): void {
        const knownDomains = new Set<string>(domainKeys());
        for (const wrapper of this.discovery.getProviders()) {
            const { metatype, instance } = wrapper;
            if (!metatype || typeof metatype !== 'function') continue;
            if (!this.reflector.get<boolean | undefined>(AI_TOOL_PROVIDER_METADATA, metatype)) continue;
            if (!isToolSource(instance)) {
                throw new Error(`${metatype.name} is an @AiToolProvider() but does not implement aiTools()`);
            }
            for (const tool of instance.aiTools()) this.register(tool, knownDomains);
        }
        this.logger.log(`Registered ${this.tools.size} AI tools`);
    }

    private register(tool: AiTool, knownDomains: ReadonlySet<string>): void {
        if (!TOOL_NAME_PATTERN.test(tool.name) || tool.name.includes('__')) {
            throw new Error(`AI tool name "${tool.name}" must match domain-noun.verb and not contain "__"`);
        }
        if (this.tools.has(tool.name)) throw new Error(`Duplicate AI tool name "${tool.name}"`);
        if (!knownDomains.has(tool.domain)) throw new Error(`AI tool "${tool.name}" has unknown domain "${tool.domain}"`);
        if (tool.name.endsWith('.delete') && tool.resource && NEVER_DELETE_RESOURCES.has(tool.resource)) {
            throw new Error(`AI tool "${tool.name}" deletes "${tool.resource}", which is cancel/reverse-only (.ai/rules/domain.md)`);
        }
        this.tools.set(tool.name, tool);
    }

    /** Every tool the user may call, regardless of scope. */
    private permitted(ctx: AiToolContext): AiTool[] {
        return [...this.tools.values()].filter((tool) => tool.enabled && ctx.permissions.has(tool.permission));
    }

    /** Tools offered to the model this turn: permitted AND (always-loaded domain OR loaded via tools.load). */
    forUser(ctx: AiToolContext, loadedDomains: readonly string[]): AiTool[] {
        return this.permitted(ctx).filter(
            (tool) => ALWAYS_LOADED_DOMAINS.has(tool.domain) || loadedDomains.includes(tool.domain),
        );
    }

    /** Execution lookup — permission is enforced here, scope is not (scope only limits the prompt). */
    find(ctx: AiToolContext, name: string): AiTool | undefined {
        const tool = this.tools.get(name);
        return tool && tool.enabled && ctx.permissions.has(tool.permission) ? tool : undefined;
    }

    search(ctx: AiToolContext, query: string): { name: string; domain: string; description: string; risk: AiToolRisk }[] {
        const needle = query.trim().toLowerCase();
        return this.permitted(ctx)
            .filter((tool) => !needle || `${tool.name} ${tool.description}`.toLowerCase().includes(needle))
            .slice(0, 25)
            .map(({ name, domain, description, risk }) => ({ name, domain, description, risk }));
    }

    availableDomains(ctx: AiToolContext): string[] {
        return [...new Set(this.permitted(ctx).map((tool) => tool.domain))].sort();
    }
}
```

- [ ] **Step 3: `tools/ai-tool-executor.ts`**

```ts
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { AiTool, AiToolContext, AiToolResult } from '@devloggers/backend-core';
import { AuditWriter } from '../../audit';

const TOOL_TIMEOUT_MS = 30_000;
const OUTPUT_CAP_CHARS = 8_000;

class ToolTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ToolTimeoutError(`Tool timed out after ${ms} ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function capOutput(output: unknown): unknown {
    const serialized = JSON.stringify(output ?? null);
    if (serialized.length <= OUTPUT_CAP_CHARS) return output ?? null;
    return { truncated: true, preview: serialized.slice(0, OUTPUT_CAP_CHARS) };
}

function entityIdOf(output: unknown, fallback: string): string {
    if (output !== null && typeof output === 'object' && 'id' in output) {
        const id = (output as { id: unknown }).id;
        if (typeof id === 'string') return id;
    }
    return fallback;
}

@Injectable()
export class AiToolExecutor {
    private readonly logger = new Logger(AiToolExecutor.name);

    constructor(private readonly audit: AuditWriter) {}

    async execute(ctx: AiToolContext, tool: AiTool, rawInput: unknown, toolCallId: string): Promise<AiToolResult> {
        // Defence in depth: the registry already filtered by permission.
        if (!ctx.permissions.has(tool.permission)) {
            return { kind: 'error', errorText: `Missing permission: ${tool.permission}` };
        }
        const prepared = await tool.prepare(rawInput);
        if (!prepared.ok) {
            return { kind: 'error', errorText: 'Invalid tool input', details: prepared.errors };
        }
        try {
            const output = await withTimeout(prepared.run(ctx), TOOL_TIMEOUT_MS);
            if (tool.risk !== 'read') {
                await this.audit.record({
                    tenantId: ctx.tenantId,
                    userId: ctx.userId,
                    action: `ai.${tool.name}`,
                    entityType: tool.resource ?? tool.domain,
                    entityId: entityIdOf(output, toolCallId),
                    newValues: rawInput,
                    source: 'AI_AGENT',
                    metadata: { conversationId: ctx.conversationId, toolCallId, tool: tool.name },
                });
            }
            return { kind: 'output', output: capOutput(output) };
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() < 500) {
                // Business-rule messages (ConflictException, validation) go back to the model so it can self-correct.
                return { kind: 'error', errorText: error.message, details: error.getResponse() };
            }
            this.logger.error({
                msg: 'AI tool failed',
                tool: tool.name,
                conversationId: ctx.conversationId,
                toolCallId,
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                kind: 'error',
                errorText: error instanceof ToolTimeoutError ? error.message : 'The action failed due to a server error.',
            };
        }
    }
}
```

- [ ] **Step 4: `tools/meta-tools.provider.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { AiToolRegistry } from './ai-tool-registry';

export class ToolsSearchInputDto {
    @ApiProperty({ type: 'string', description: 'What you want to do, e.g. "stock count" or "warehouse"' })
    @IsString()
    @MaxLength(200)
    query!: string;
}

export class ToolsLoadInputDto {
    @ApiProperty({ type: 'string', description: 'Domain key returned by tools.search, e.g. "inventory"' })
    @IsString()
    @IsNotEmpty()
    domain!: string;
}

@AiToolProvider()
@Injectable()
export class MetaToolsProvider implements AiToolSource {
    constructor(private readonly registry: AiToolRegistry) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'tools.search',
                domain: 'ai-agent',
                risk: 'read',
                permission: 'ai.use',
                description:
                    'Find tools you are allowed to use that are not loaded yet. Returns name, domain, description, risk. ' +
                    'Then call tools.load with the domain to use them.',
                input: dtoInput(ToolsSearchInputDto),
                handler: async (ctx, input) => ({ tools: this.registry.search(ctx, input.query) }),
            }),
            defineAiTool({
                name: 'tools.load',
                domain: 'ai-agent',
                risk: 'read',
                permission: 'ai.use',
                description: 'Load all tools of one domain so you can call them on your next step.',
                input: dtoInput(ToolsLoadInputDto),
                handler: async (ctx, input) => {
                    if (!this.registry.availableDomains(ctx).includes(input.domain)) {
                        return { error: `Unknown or unavailable domain "${input.domain}"` };
                    }
                    return { loadedDomain: input.domain };
                },
            }),
        ];
    }
}
```

- [ ] **Step 5: Wire into the module**

`ai-agent.module.ts` — add `DiscoveryModule` and the providers:

```ts
import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ConversationsController } from './conversations/controllers/conversations.controller';
import { ConversationsRepository } from './conversations/repositories/conversations.repository';
import { ConversationPresenter } from './conversations/presenters/conversation.presenter';
import { ConversationsService } from './conversations/services/conversations.service';
import { AiToolRegistry } from './tools/ai-tool-registry';
import { AiToolExecutor } from './tools/ai-tool-executor';
import { MetaToolsProvider } from './tools/meta-tools.provider';

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
    ],
})
export class AiAgentModule {}
```

(`AuditModule` is `@Global`; `AuditWriter` injects without an import.)

- [ ] **Step 6: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json` → exit 0.
Run: `pnpm --filter @devloggers/api lint:architecture` → passes (`ai-agent` imports only `audit` barrel + identity kernel + `src/domain`).

---

### Task 6: Prisma checkpointer

**Files:**
- Create: `apps/api/src/modules/ai-agent/runtime/prisma-checkpoint-saver.ts`
- Modify: `apps/api/src/modules/ai-agent/ai-agent.module.ts` (add provider)

**Interfaces:**
- Consumes: `prisma.aiCheckpoint`, `prisma.aiCheckpointWrite` (Task 2).
- Produces: `PrismaCheckpointSaver extends BaseCheckpointSaver` (injectable). Requires `config.configurable.tenant_id` on writes.

- [ ] **Step 1: Implement**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
    BaseCheckpointSaver,
    WRITES_IDX_MAP,
    type ChannelVersions,
    type Checkpoint,
    type CheckpointListOptions,
    type CheckpointMetadata,
    type CheckpointPendingWrite,
    type CheckpointTuple,
    type PendingWrite,
} from '@langchain/langgraph-checkpoint';

type Configurable = { thread_id?: string; checkpoint_ns?: string; checkpoint_id?: string; tenant_id?: string };

function configurable(config: RunnableConfig): Configurable {
    return (config.configurable ?? {}) as Configurable;
}

function requireThread(c: Configurable): string {
    if (!c.thread_id) throw new Error('PrismaCheckpointSaver: configurable.thread_id is required');
    return c.thread_id;
}

function requireTenant(c: Configurable): string {
    if (!c.tenant_id) throw new Error('PrismaCheckpointSaver: configurable.tenant_id is required');
    return c.tenant_id;
}

/**
 * LangGraph checkpointer on Prisma so the tables come from a Prisma migration
 * (".ai/rules/monorepo.md: DB changes via Prisma migrations only").
 * Checkpoint ids are uuid6 (time-ordered), so lexical order = chronological order.
 */
@Injectable()
export class PrismaCheckpointSaver extends BaseCheckpointSaver {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const checkpointNs = c.checkpoint_ns ?? '';
        const row = c.checkpoint_id
            ? await this.prisma.aiCheckpoint.findUnique({
                  where: { threadId_checkpointNs_checkpointId: { threadId, checkpointNs, checkpointId: c.checkpoint_id } },
              })
            : await this.prisma.aiCheckpoint.findFirst({
                  where: { threadId, checkpointNs },
                  orderBy: { checkpointId: 'desc' },
              });
        if (!row) return undefined;

        const writes = await this.prisma.aiCheckpointWrite.findMany({
            where: { threadId, checkpointNs, checkpointId: row.checkpointId },
            orderBy: [{ taskId: 'asc' }, { idx: 'asc' }],
        });
        const pendingWrites: CheckpointPendingWrite[] = await Promise.all(
            writes.map(async (write): Promise<CheckpointPendingWrite> => [
                write.taskId,
                write.channel,
                await this.serde.loadsTyped(write.type, write.value),
            ]),
        );

        return {
            config: { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: row.checkpointId } },
            checkpoint: (await this.serde.loadsTyped(row.type, row.checkpoint)) as Checkpoint,
            metadata: row.metadata as CheckpointMetadata,
            parentConfig: row.parentCheckpointId
                ? { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: row.parentCheckpointId } }
                : undefined,
            pendingWrites,
        };
    }

    async *list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const before = options?.before ? configurable(options.before).checkpoint_id : undefined;
        const rows = await this.prisma.aiCheckpoint.findMany({
            where: {
                threadId,
                ...(c.checkpoint_ns !== undefined ? { checkpointNs: c.checkpoint_ns } : {}),
                ...(before ? { checkpointId: { lt: before } } : {}),
            },
            orderBy: { checkpointId: 'desc' },
            ...(options?.limit ? { take: options.limit } : {}),
        });
        for (const row of rows) {
            if (options?.filter) {
                const metadata = row.metadata as Record<string, unknown>;
                const matches = Object.entries(options.filter).every(([key, value]) => metadata[key] === value);
                if (!matches) continue;
            }
            const tuple = await this.getTuple({
                configurable: { thread_id: threadId, checkpoint_ns: row.checkpointNs, checkpoint_id: row.checkpointId },
            });
            if (tuple) yield tuple;
        }
    }

    async put(
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        _newVersions: ChannelVersions,
    ): Promise<RunnableConfig> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const tenantId = requireTenant(c);
        const checkpointNs = c.checkpoint_ns ?? '';
        const [type, bytes] = await this.serde.dumpsTyped(checkpoint);
        const data = {
            parentCheckpointId: c.checkpoint_id ?? null,
            tenantId,
            type,
            checkpoint: Buffer.from(bytes),
            metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
        };
        await this.prisma.aiCheckpoint.upsert({
            where: { threadId_checkpointNs_checkpointId: { threadId, checkpointNs, checkpointId: checkpoint.id } },
            create: { threadId, checkpointNs, checkpointId: checkpoint.id, ...data },
            update: data,
        });
        return { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: checkpoint.id } };
    }

    async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const tenantId = requireTenant(c);
        const checkpointNs = c.checkpoint_ns ?? '';
        const checkpointId = c.checkpoint_id;
        if (!checkpointId) throw new Error('PrismaCheckpointSaver.putWrites: configurable.checkpoint_id is required');

        const operations = await Promise.all(
            writes.map(async ([channel, value], index) => {
                const idx = WRITES_IDX_MAP[channel] ?? index;
                const [type, bytes] = await this.serde.dumpsTyped(value);
                const payload = { channel, type, value: Buffer.from(bytes), tenantId };
                return this.prisma.aiCheckpointWrite.upsert({
                    where: {
                        threadId_checkpointNs_checkpointId_taskId_idx: { threadId, checkpointNs, checkpointId, taskId, idx },
                    },
                    create: { threadId, checkpointNs, checkpointId, taskId, idx, ...payload },
                    update: payload,
                });
            }),
        );
        await this.prisma.$transaction(operations);
    }

    async deleteThread(threadId: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.aiCheckpointWrite.deleteMany({ where: { threadId } }),
            this.prisma.aiCheckpoint.deleteMany({ where: { threadId } }),
        ]);
    }
}
```

Notes for the implementer:
- `@langchain/langgraph-checkpoint` is a dependency of `@langchain/langgraph`; if TypeScript cannot resolve it directly (pnpm strictness), add it explicitly: `pnpm --filter @devloggers/api add @langchain/langgraph-checkpoint`.
- If the installed `BaseCheckpointSaver` declares `serde.dumpsTyped` / `loadsTyped` synchronous, the `await`s are harmless.
- If `deleteThread` is not abstract in the installed version, keep it anyway (used nowhere else; `ConversationsRepository` deletes checkpoints directly in its transaction).

- [ ] **Step 2: Register provider**

Add `PrismaCheckpointSaver` to `providers` in `ai-agent.module.ts` (import from `./runtime/prisma-checkpoint-saver`).

- [ ] **Step 3: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json` → exit 0.

---

### Task 7: Agent graph, model factory, system prompt

**Files:**
- Create: `apps/api/src/modules/ai-agent/runtime/model.factory.ts`
- Create: `apps/api/src/modules/ai-agent/runtime/system-prompt.ts`
- Create: `apps/api/src/modules/ai-agent/runtime/agent-state.ts`
- Create: `apps/api/src/modules/ai-agent/runtime/agent-graph.ts`
- Modify: `apps/api/src/modules/ai-agent/ai-agent.module.ts` (add `ChatModelFactory`)

**Interfaces:**
- Consumes: `AiToolRegistry.forUser/find`, `AiToolExecutor.execute`, `toModelToolName/fromModelToolName` (Task 5), `PrismaCheckpointSaver` (Task 6).
- Produces:
  - `ChatModelFactory.create(): ChatOpenAI` (throws `ServiceUnavailableException` when unconfigured); `ChatModelFactory.describe(): { provider: string; model: string | null }`
  - `AgentState` annotation: `messages`, `loadedDomains: string[]`, `decisions: Record<string, ApprovalDecision>`
  - `type ApprovalDecision = { toolCallId: string; approved: boolean; reason?: string }`
  - `type PendingApprovalCall = { toolCallId: string; name: string; risk: 'write' | 'destructive'; input: Record<string, unknown> }`
  - `type ApprovalInterrupt = { calls: PendingApprovalCall[] }`, `type ApprovalResume = { decisions: ApprovalDecision[] }`
  - `buildAgentGraph(deps: AgentGraphDeps)` → compiled graph; `AgentGraph = ReturnType<typeof buildAgentGraph>`
  - `AGENT_NODE = 'agent'`, `TOOLS_NODE = 'tools'`
  - ToolMessage `artifact` is the `AiToolResult`; the translator (Task 8) reads it.

- [ ] **Step 1: `runtime/model.factory.ts`**

```ts
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
```

- [ ] **Step 2: `runtime/system-prompt.ts`**

```ts
import type { AiToolContext } from '@devloggers/backend-core';

const LANGUAGE_BY_LOCALE: Record<string, string> = { ar: 'Arabic', tr: 'Turkish', en: 'English' };

export function buildSystemPrompt(ctx: AiToolContext, now: Date = new Date()): string {
    const language = LANGUAGE_BY_LOCALE[ctx.locale.split('-')[0]] ?? 'English';
    return [
        'You are the assistant inside an ERP system (catalog, parties, inventory, invoicing, accounting).',
        `Reply in ${language}. Today is ${now.toISOString().slice(0, 10)}.`,
        'Use tools to read and change data. Never invent record IDs, prices or quantities — look them up first.',
        'Tools that change data are confirmed by the user before they run; ask for missing required fields instead of guessing.',
        'If a tool returns an error, explain it plainly and propose the fix. If the user rejected an action, do not retry it unless asked.',
        'If you need a capability you do not have, call tools.search, then tools.load with the domain it returns.',
        'Keep answers short. Use Markdown tables for lists of records.',
    ].join('\n');
}
```

- [ ] **Step 3: `runtime/agent-state.ts`**

```ts
import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

export type ApprovalDecision = { toolCallId: string; approved: boolean; reason?: string };

export type PendingApprovalCall = {
    toolCallId: string;
    name: string;
    risk: 'write' | 'destructive';
    input: Record<string, unknown>;
};

export type ApprovalInterrupt = { calls: PendingApprovalCall[] };
export type ApprovalResume = { decisions: ApprovalDecision[] };

export const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,
    /** Domains pulled in by tools.load; persists across turns via the checkpointer. */
    loadedDomains: Annotation<string[]>({
        reducer: (current, update) => [...new Set([...current, ...update])],
        default: () => [],
    }),
    /** Decisions for the current tool batch; reset by the agent node every step. */
    decisions: Annotation<Record<string, ApprovalDecision>>({
        reducer: (_current, update) => update,
        default: () => ({}),
    }),
});

export type AgentStateValue = typeof AgentState.State;
```

- [ ] **Step 4: `runtime/agent-graph.ts`**

```ts
import { AIMessage, SystemMessage, ToolMessage, trimMessages, type BaseMessage } from '@langchain/core/messages';
import { END, START, StateGraph, interrupt } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { ChatOpenAI } from '@langchain/openai';
import type { AiTool, AiToolContext, AiToolResult } from '@devloggers/backend-core';
import type { AiToolRegistry } from '../tools/ai-tool-registry';
import type { AiToolExecutor } from '../tools/ai-tool-executor';
import { fromModelToolName, toModelToolName } from '../tools/tool-names';
import { AgentState, type AgentStateValue, type ApprovalInterrupt, type ApprovalResume, type PendingApprovalCall } from './agent-state';
import { buildSystemPrompt } from './system-prompt';

export const AGENT_NODE = 'agent';
export const GATE_NODE = 'gate';
export const TOOLS_NODE = 'tools';

const CONTEXT_TOKEN_BUDGET = 60_000;

export interface AgentGraphDeps {
    readonly ctx: AiToolContext;
    readonly model: ChatOpenAI;
    readonly registry: AiToolRegistry;
    readonly executor: AiToolExecutor;
    readonly checkpointer: BaseCheckpointSaver;
}

function toOpenAiTool(tool: AiTool) {
    return {
        type: 'function' as const,
        function: { name: toModelToolName(tool.name), description: tool.description, parameters: tool.jsonSchema },
    };
}

function lastAiMessage(messages: BaseMessage[]): AIMessage | undefined {
    const last = messages[messages.length - 1];
    return last instanceof AIMessage ? last : undefined;
}

function toolMessage(toolCallId: string, result: AiToolResult): ToolMessage {
    const forModel =
        result.kind === 'output'
            ? result.output
            : result.kind === 'denied'
              ? { rejected: true, message: `Rejected by user: ${result.reason}. Do not retry unless the user asks again.` }
              : { error: result.errorText, details: result.details };
    return new ToolMessage({
        tool_call_id: toolCallId,
        content: JSON.stringify(forModel),
        status: result.kind === 'output' ? 'success' : 'error',
        artifact: result,
    });
}

/** Rough, provider-neutral token estimate (~4 chars/token). */
function estimateTokens(messages: BaseMessage[]): number {
    return messages.reduce((total, message) => total + Math.ceil(JSON.stringify(message.content).length / 4), 0);
}

export function buildAgentGraph(deps: AgentGraphDeps) {
    const { ctx, model, registry, executor, checkpointer } = deps;

    const agent = async (state: AgentStateValue) => {
        const tools = registry.forUser(ctx, state.loadedDomains);
        const bound = model.bindTools(tools.map(toOpenAiTool));
        const history = await trimMessages(state.messages, {
            maxTokens: CONTEXT_TOKEN_BUDGET,
            strategy: 'last',
            tokenCounter: estimateTokens,
            startOn: 'human',
            allowPartial: false,
        });
        const response = await bound.invoke([new SystemMessage(buildSystemPrompt(ctx)), ...history]);
        return { messages: [response], decisions: {} };
    };

    const afterAgent = (state: AgentStateValue) =>
        (lastAiMessage(state.messages)?.tool_calls?.length ?? 0) > 0 ? GATE_NODE : END;

    // No side effects before interrupt(): LangGraph re-runs this node from the top on resume.
    const gate = async (state: AgentStateValue) => {
        const calls = lastAiMessage(state.messages)?.tool_calls ?? [];
        const pending: PendingApprovalCall[] = [];
        for (const call of calls) {
            const tool = registry.find(ctx, fromModelToolName(call.name));
            if (!call.id || !tool || tool.risk === 'read') continue;
            const prepared = await tool.prepare(call.args);
            if (!prepared.ok) continue; // invalid input is reported by the tools node without asking the user
            pending.push({ toolCallId: call.id, name: tool.name, risk: tool.risk, input: call.args });
        }
        if (pending.length === 0) return { decisions: {} };
        const resume = interrupt<ApprovalInterrupt, ApprovalResume>({ calls: pending });
        return { decisions: Object.fromEntries(resume.decisions.map((decision) => [decision.toolCallId, decision])) };
    };

    const tools = async (state: AgentStateValue) => {
        const calls = lastAiMessage(state.messages)?.tool_calls ?? [];
        const messages: ToolMessage[] = [];
        const loadedDomains: string[] = [];

        for (const call of calls) {
            const toolCallId = call.id ?? '';
            const name = fromModelToolName(call.name);
            const tool = registry.find(ctx, name);
            if (!tool) {
                messages.push(toolMessage(toolCallId, { kind: 'error', errorText: `Tool "${name}" is unknown or not permitted` }));
                continue;
            }
            if (tool.risk !== 'read') {
                const decision = state.decisions[toolCallId];
                if (decision && !decision.approved) {
                    messages.push(toolMessage(toolCallId, { kind: 'denied', reason: decision.reason ?? 'no reason given' }));
                    continue;
                }
                if (!decision) {
                    // Only reachable when input was invalid (gate skipped it): let the executor report the validation error.
                    const prepared = await tool.prepare(call.args);
                    if (prepared.ok) {
                        messages.push(toolMessage(toolCallId, { kind: 'denied', reason: 'approval missing' }));
                        continue;
                    }
                }
            }
            const result = await executor.execute(ctx, tool, call.args, toolCallId);
            if (name === 'tools.load' && result.kind === 'output') {
                const loaded = (result.output as { loadedDomain?: unknown } | null)?.loadedDomain;
                if (typeof loaded === 'string') loadedDomains.push(loaded);
            }
            messages.push(toolMessage(toolCallId, result));
        }
        return { messages, loadedDomains };
    };

    return new StateGraph(AgentState)
        .addNode(AGENT_NODE, agent)
        .addNode(GATE_NODE, gate)
        .addNode(TOOLS_NODE, tools)
        .addEdge(START, AGENT_NODE)
        .addConditionalEdges(AGENT_NODE, afterAgent, [GATE_NODE, END])
        .addEdge(GATE_NODE, TOOLS_NODE)
        .addEdge(TOOLS_NODE, AGENT_NODE)
        .compile({ checkpointer });
}

export type AgentGraph = ReturnType<typeof buildAgentGraph>;
```

- [ ] **Step 5: Register `ChatModelFactory`**

Add `ChatModelFactory` to `providers` in `ai-agent.module.ts`. (`ConfigModule` is global in this app — `AiChatService` injected `ConfigService` without importing it.)

- [ ] **Step 6: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json` → exit 0. If `interrupt` in the installed version is not generic, do **not** cast its return value — add a runtime guard instead:

```ts
function isApprovalResume(value: unknown): value is ApprovalResume {
    return value !== null && typeof value === 'object' && Array.isArray((value as { decisions?: unknown }).decisions);
}
```

and use `const resume: unknown = interrupt({ calls: pending }); if (!isApprovalResume(resume)) throw new Error('Invalid approval resume');`.

---

### Task 8: Chat streaming endpoint

**Files:**
- Create: `apps/api/src/modules/ai-agent/chat/dto/chat-request.dto.ts`
- Create: `apps/api/src/modules/ai-agent/chat/chat-rate-limiter.ts`
- Create: `apps/api/src/modules/ai-agent/chat/ui-stream.translator.ts`
- Create: `apps/api/src/modules/ai-agent/chat/chat.service.ts`
- Create: `apps/api/src/modules/ai-agent/chat/chat.controller.ts`
- Modify: `apps/api/src/modules/ai-agent/ai-agent.module.ts`

**Interfaces:**
- Consumes: everything from Tasks 4–7; `PermissionResolverService` from `identity/auth/guards`.
- Produces:
  - Route `POST /ai/conversations/{id}/chat` body `ChatRequestDto` → SSE (AI SDK UI message stream v1).
  - Route `GET /ai/model` → `AiModelResponseDto`.
  - Stream contract used by the dashboard: tool parts are **dynamic** (`type: 'dynamic-tool'`, `toolName` dotted); each tool call also emits a data part `{ type: 'data-toolMeta', id: toolCallId, data: { toolCallId, risk } }`; approvals use `approvalId === toolCallId`.

- [ ] **Step 1: `chat/dto/chat-request.dto.ts`**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatUserMessageDto {
    @ApiProperty({ type: 'string', description: 'Client-generated message id (AI SDK)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    id!: string;

    @ApiProperty({ type: 'string', example: 'List my units' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(8000)
    text!: string;
}

export class ApprovalDecisionDto {
    @ApiProperty({ type: 'string' })
    @IsString()
    @IsNotEmpty()
    toolCallId!: string;

    @ApiProperty({ type: 'boolean' })
    @IsBoolean()
    approved!: boolean;

    @ApiPropertyOptional({ type: 'string' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

/** Exactly one of `message` / `approvals` (checked in ChatService). */
export class ChatRequestDto {
    @ApiPropertyOptional({ type: () => ChatUserMessageDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ChatUserMessageDto)
    message?: ChatUserMessageDto;

    @ApiPropertyOptional({ type: () => ApprovalDecisionDto, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => ApprovalDecisionDto)
    approvals?: ApprovalDecisionDto[];
}
```

- [ ] **Step 2: `chat/chat-rate-limiter.ts`**

```ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

/** Per-user sliding window, in-process. Enough for one API instance; revisit when scaling out. */
@Injectable()
export class ChatRateLimiter {
    private readonly hits = new Map<string, number[]>();

    consume(userId: string, now: number = Date.now()): void {
        const recent = (this.hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
        if (recent.length >= MAX_REQUESTS) {
            throw new HttpException('Too many AI requests — wait a minute and try again', HttpStatus.TOO_MANY_REQUESTS);
        }
        recent.push(now);
        this.hits.set(userId, recent);
    }
}
```

- [ ] **Step 3: `chat/ui-stream.translator.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { AIMessage, AIMessageChunk, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import type { UIMessage, UIMessageStreamWriter } from 'ai';
import type { AiToolRegistry } from '../tools/ai-tool-registry';
import type { AiToolContext, AiToolResult } from '@devloggers/backend-core';
import { fromModelToolName } from '../tools/tool-names';
import { AGENT_NODE, TOOLS_NODE } from '../runtime/agent-graph';
import type { ApprovalInterrupt } from '../runtime/agent-state';

type StreamPart = [string, unknown];

function isAiToolResult(value: unknown): value is AiToolResult {
    return value !== null && typeof value === 'object' && 'kind' in value;
}

function messagesOf(update: unknown): BaseMessage[] {
    const messages = (update as { messages?: unknown } | null)?.messages;
    return Array.isArray(messages) ? (messages as BaseMessage[]) : [];
}

/**
 * Translates `graph.stream(..., { streamMode: ['messages', 'updates'] })` into
 * AI SDK UI message chunks. Text streams token by token from the agent node;
 * tool calls/results come from node updates; an interrupt becomes approval requests.
 */
export async function translateGraphStream(
    stream: AsyncIterable<StreamPart>,
    writer: UIMessageStreamWriter<UIMessage>,
    deps: { registry: AiToolRegistry; ctx: AiToolContext },
): Promise<void> {
    let textId: string | null = null;
    const closeText = () => {
        if (textId) writer.write({ type: 'text-end', id: textId });
        textId = null;
    };

    for await (const [mode, payload] of stream) {
        if (mode === 'messages') {
            const [chunk, meta] = payload as [BaseMessage, { langgraph_node?: string }];
            if (meta?.langgraph_node !== AGENT_NODE || !(chunk instanceof AIMessageChunk)) continue;
            const delta = typeof chunk.content === 'string' ? chunk.content : '';
            if (!delta) continue;
            if (!textId) {
                textId = randomUUID();
                writer.write({ type: 'text-start', id: textId });
            }
            writer.write({ type: 'text-delta', id: textId, delta });
            continue;
        }

        if (mode !== 'updates') continue;
        const update = (payload ?? {}) as Record<string, unknown>;
        closeText();

        for (const message of messagesOf(update[AGENT_NODE])) {
            if (!(message instanceof AIMessage)) continue;
            for (const call of message.tool_calls ?? []) {
                if (!call.id) continue;
                const toolName = fromModelToolName(call.name);
                const risk = deps.registry.find(deps.ctx, toolName)?.risk ?? 'read';
                writer.write({ type: 'data-toolMeta', id: call.id, data: { toolCallId: call.id, risk } });
                writer.write({ type: 'tool-input-available', toolCallId: call.id, toolName, input: call.args, dynamic: true });
            }
        }

        for (const message of messagesOf(update[TOOLS_NODE])) {
            if (!(message instanceof ToolMessage)) continue;
            const result = isAiToolResult(message.artifact) ? message.artifact : undefined;
            if (!result || result.kind === 'output') {
                writer.write({
                    type: 'tool-output-available',
                    toolCallId: message.tool_call_id,
                    output: result?.kind === 'output' ? result.output : message.content,
                    dynamic: true,
                });
            } else if (result.kind === 'denied') {
                writer.write({ type: 'tool-output-denied', toolCallId: message.tool_call_id });
            } else {
                writer.write({ type: 'tool-output-error', toolCallId: message.tool_call_id, errorText: result.errorText, dynamic: true });
            }
        }

        const interrupts = update['__interrupt__'];
        if (Array.isArray(interrupts)) {
            for (const item of interrupts) {
                const value = (item as { value?: ApprovalInterrupt }).value;
                for (const call of value?.calls ?? []) {
                    writer.write({ type: 'tool-approval-request', approvalId: call.toolCallId, toolCallId: call.toolCallId });
                }
            }
        }
    }
    closeText();
}
```

If the installed `ai` types reject a chunk property (e.g. `dynamic` on `tool-output-available`), remove that property — the chunk union in `node_modules/ai/dist/index.d.ts` (`UIMessageChunk`) is authoritative. Do not cast.

- [ ] **Step 4: `chat/chat.service.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { createUIMessageStream, pipeUIMessageStreamToResponse, type UIMessage } from 'ai';
import type { AiConversation } from '@devloggers/db-prisma';
import type { AiToolContext, RequestUser } from '@devloggers/backend-core';
import { PermissionResolverService } from '../../identity/auth/guards';
import { ConversationsService, type StoredUiMessage } from '../conversations/services/conversations.service';
import { AiToolRegistry } from '../tools/ai-tool-registry';
import { AiToolExecutor } from '../tools/ai-tool-executor';
import { ChatModelFactory } from '../runtime/model.factory';
import { PrismaCheckpointSaver } from '../runtime/prisma-checkpoint-saver';
import { buildAgentGraph, type AgentGraph } from '../runtime/agent-graph';
import type { ApprovalDecision, ApprovalInterrupt, PendingApprovalCall } from '../runtime/agent-state';
import { translateGraphStream } from './ui-stream.translator';
import { ChatRateLimiter } from './chat-rate-limiter';
import type { ChatRequestDto } from './dto/chat-request.dto';

const RECURSION_LIMIT = 25;

type GraphConfig = { configurable: { thread_id: string; tenant_id: string }; recursionLimit: number };

function toUiMessage(stored: StoredUiMessage): UIMessage {
    // Parts were produced by the AI SDK itself (stored verbatim in onFinish) — shape is the SDK's own.
    return { id: stored.id, role: stored.role, parts: stored.parts as UIMessage['parts'] };
}

/** Marks still-pending approval parts as denied (superseded by a new user message). */
function supersedeApprovalParts(parts: Record<string, unknown>[]): Record<string, unknown>[] {
    return parts.map((part) =>
        part.state === 'approval-requested'
            ? { ...part, state: 'output-denied', approval: { ...(part.approval as object), approved: false, reason: 'superseded' } }
            : part,
    );
}

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private readonly conversations: ConversationsService,
        private readonly registry: AiToolRegistry,
        private readonly executor: AiToolExecutor,
        private readonly models: ChatModelFactory,
        private readonly checkpointer: PrismaCheckpointSaver,
        private readonly permissions: PermissionResolverService,
        private readonly rateLimiter: ChatRateLimiter,
    ) {}

    async stream(user: RequestUser, conversationId: string, body: ChatRequestDto, locale: string, res: Response): Promise<void> {
        if (Boolean(body.message) === Boolean(body.approvals?.length)) {
            throw new BadRequestException('Send exactly one of "message" or "approvals"');
        }
        const conversation = await this.conversations.getOwned(user.tenantId, user.id, conversationId);
        this.rateLimiter.consume(user.id);

        const ctx: AiToolContext = {
            tenantId: user.tenantId,
            userId: user.id,
            permissions: await this.permissions.resolve(user.id, user.tenantId),
            locale,
            conversationId,
        };
        const graph = buildAgentGraph({
            ctx,
            model: this.models.create(),
            registry: this.registry,
            executor: this.executor,
            checkpointer: this.checkpointer,
        });
        const config: GraphConfig = {
            configurable: { thread_id: conversationId, tenant_id: user.tenantId },
            recursionLimit: RECURSION_LIMIT,
        };
        const pending = await this.pendingApprovals(graph, config);

        let input: HumanMessage[] | Command;
        let original: StoredUiMessage | null = null;

        if (body.approvals?.length) {
            this.assertDecisionsMatch(pending, body.approvals);
            input = new Command({ resume: { decisions: body.approvals satisfies ApprovalDecision[] } });
            original = await this.conversations.findLastAssistantMessage(conversationId);
        } else {
            const message = body.message!;
            if (pending.length > 0) await this.supersede(graph, config, conversation, pending);
            await this.conversations.saveUserMessage(conversation, message);
            input = [new HumanMessage(message.text)];
        }

        const uiStream = createUIMessageStream<UIMessage>({
            originalMessages: original ? [toUiMessage(original)] : undefined,
            generateId: () => randomUUID(),
            execute: async ({ writer }) => {
                const graphInput = input instanceof Command ? input : { messages: input };
                const events = await graph.stream(graphInput, { ...config, streamMode: ['messages', 'updates'] });
                await translateGraphStream(events as AsyncIterable<[string, unknown]>, writer, { registry: this.registry, ctx });
            },
            onError: (error) => {
                this.logger.error({ msg: 'AI chat stream failed', conversationId, error: error instanceof Error ? error.message : String(error) });
                return 'The assistant failed to respond. Please try again.';
            },
            onFinish: async ({ responseMessage }) => {
                await this.persistAssistant(conversation, responseMessage);
            },
        });

        // Tee: the client branch may disconnect; the drain branch always runs the stream
        // to completion so onFinish persists the result.
        const [clientStream, drainStream] = uiStream.tee();
        void this.drain(drainStream, conversationId);
        pipeUIMessageStreamToResponse({ response: res, stream: clientStream });
    }

    private async pendingApprovals(graph: AgentGraph, config: GraphConfig): Promise<PendingApprovalCall[]> {
        const state = await graph.getState(config);
        return state.tasks.flatMap((task) =>
            task.interrupts.flatMap((item) => (item.value as ApprovalInterrupt | undefined)?.calls ?? []),
        );
    }

    /** A resume must answer exactly the pending tool calls — anything else is stale or forged. */
    private assertDecisionsMatch(pending: PendingApprovalCall[], decisions: ApprovalDecision[]): void {
        const expected = new Set(pending.map((call) => call.toolCallId));
        const received = new Set(decisions.map((decision) => decision.toolCallId));
        const same = expected.size > 0 && expected.size === received.size && [...expected].every((id) => received.has(id));
        if (!same) throw new ConflictException('These approvals do not match the pending actions. Reload the conversation.');
    }

    private async supersede(graph: AgentGraph, config: GraphConfig, conversation: AiConversation, pending: PendingApprovalCall[]): Promise<void> {
        const decisions: ApprovalDecision[] = pending.map((call) => ({ toolCallId: call.toolCallId, approved: false, reason: 'superseded' }));
        const run = await graph.stream(new Command({ resume: { decisions } }), { ...config, streamMode: 'updates' });
        for await (const _ of run) {
            // drain — the model's reply to the rejection is not shown; the new message follows.
        }
        const last = await this.conversations.findLastAssistantMessage(conversation.id);
        if (last) {
            await this.conversations.upsertAssistantMessage(conversation, { ...last, parts: supersedeApprovalParts(last.parts) });
        }
    }

    private async persistAssistant(conversation: AiConversation, message: UIMessage): Promise<void> {
        const parts = JSON.parse(JSON.stringify(message.parts)) as Record<string, unknown>[];
        await this.conversations.upsertAssistantMessage(
            conversation,
            { id: message.id, role: 'assistant', parts },
            { model: this.models.describe().model },
        );
    }

    private async drain(stream: ReadableStream<unknown>, conversationId: string): Promise<void> {
        const reader = stream.getReader();
        try {
            for (;;) {
                const { done } = await reader.read();
                if (done) return;
            }
        } catch (error) {
            this.logger.error({ msg: 'AI chat drain failed', conversationId, error: error instanceof Error ? error.message : String(error) });
        }
    }
}
```

Implementation notes:
- In `supersede`, the drained run still ends in the agent node producing a short reply; it is intentionally not persisted (the next turn's reply supersedes it). Keep it.
- If `createUIMessageStream` in the installed `ai` requires explicit `start`/`finish` chunks, write `writer.write({ type: 'start' })` at the top of `execute` and `writer.write({ type: 'finish' })` at the end. Check with the curl in Step 7: the SSE must contain exactly one `"type":"start"` and one `"type":"finish"`.
- `graph.getState(config).tasks[].interrupts[].value` is where LangGraph JS exposes pending interrupts; if the installed version names it differently, read `StateSnapshot` in `node_modules/@langchain/langgraph/dist/pregel/types.d.ts` and adapt the accessor.

- [ ] **Step 5: `chat/chat.controller.ts`**

```ts
import { Body, Controller, Get, Headers, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission } from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';
import { CurrentUser, type RequestUser } from '../../identity/auth/decorators';
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
        private readonly chat: ChatService,
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
        const locale = (acceptLanguage ?? 'en').split(',')[0].trim() || 'en';
        await this.chat.stream(user, id, body, locale, res);
    }
}
```

Errors thrown before `pipeUIMessageStreamToResponse` (404, 400, 409, 429, 503) still reach Nest's exception filter because nothing has been written to `res` yet.

- [ ] **Step 6: Final module**

```ts
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
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { ChatRateLimiter } from './chat/chat-rate-limiter';

@Module({
    imports: [DiscoveryModule],
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
```

- [ ] **Step 7: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json` → exit 0.
Run: `pnpm --filter @devloggers/api lint` → exit 0.
Start the API (`pnpm --filter @devloggers/api dev`, user must have set `AI_MODEL` and `OPENAI_API_KEY`), log in to get a token, then:

```bash
curl -s -X POST http://localhost:4040/ai/conversations -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# take data.id as $CID
curl -N -X POST "http://localhost:4040/ai/conversations/$CID/chat" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"message":{"id":"m1","text":"Say hello"}}'
```

Expected: `data: {"type":"start",...}`, several `"type":"text-delta"`, one `"type":"finish"`, then `data: [DONE]`. `GET /ai/conversations/$CID/messages` returns 2 messages (USER, ASSISTANT).

---

### Task 9: Pilot tool providers (units, items, customers)

**Files:**
- Create: `apps/api/src/modules/catalog/units/units.ai-tools.ts`
- Modify: `apps/api/src/modules/catalog/units/units.module.ts`
- Create: `apps/api/src/modules/catalog/items/items.ai-tools.ts`
- Modify: `apps/api/src/modules/catalog/items/items.module.ts`
- Create: `apps/api/src/modules/parties/parties.ai-tools.ts`
- Modify: `apps/api/src/modules/parties/parties.module.ts`

**Interfaces:**
- Consumes: `defineCrudAiTools`, `AiToolProvider`, `AiToolSource` (Task 3); existing services, DTOs and the controllers' `filterSchema` values.
- Produces: tools `units.list|show|create|update`, `items.list|show|create|update`, `customers.list|show|create|update`.

- [ ] **Step 1: Export the units filter schema**

In `apps/api/src/modules/catalog/units/controllers/units.controller.ts`, lift the inline `filterSchema` array (lines 55–60) into an exported constant above the factory call and reference it:

```ts
export const UNITS_FILTER_SCHEMA: FilterSchema = [
  { field: 'name', type: 'string', localized: true },
  { field: 'abbreviation', type: 'string' },
  { field: 'isActive', type: 'boolean' },
  { field: 'createdAt', type: 'date' },
];
```

(`import type { FilterSchema } from '@devloggers/backend-core'`; then `filterSchema: UNITS_FILTER_SCHEMA,` in `createCrudController({...})`.) Do the same for the items controller (`ITEMS_FILTER_SCHEMA`) and `parties.controller.ts` (`PARTIES_FILTER_SCHEMA`), copying their existing arrays verbatim.

- [ ] **Step 2: `units.ai-tools.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { UnitsService } from './services/units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto';
import { UNITS_FILTER_SCHEMA } from './controllers/units.controller';

@AiToolProvider()
@Injectable()
export class UnitsAiTools implements AiToolSource {
  constructor(private readonly units: UnitsService) {}

  aiTools(): readonly AiTool[] {
    return defineCrudAiTools({
      prefix: 'units',
      resource: resources.units.key,
      domain: 'catalog',
      label: 'unit of measure',
      service: this.units,
      createDto: CreateUnitDto,
      updateDto: UpdateUnitDto,
      filterSchema: UNITS_FILTER_SCHEMA,
      searchFields: ['name', 'abbreviation'],
      permissions: { view: 'units.view', create: 'units.create', update: 'units.update' },
    });
  }
}
```

Add `UnitsAiTools` to `providers` in `units.module.ts`.

- [ ] **Step 3: `items.ai-tools.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ItemsService } from './services/items.service';
import { CreateItemDto, UpdateItemDto } from './dto';
import { ITEMS_FILTER_SCHEMA } from './controllers/items.controller';

@AiToolProvider()
@Injectable()
export class ItemsAiTools implements AiToolSource {
    constructor(private readonly items: ItemsService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'items',
            resource: resources.items.key,
            domain: 'catalog',
            label: 'item (product, service or part)',
            service: this.items,
            createDto: CreateItemDto,
            updateDto: UpdateItemDto,
            filterSchema: ITEMS_FILTER_SCHEMA,
            searchFields: ['name', 'code'],
            permissions: { view: 'items.view', create: 'items.create', update: 'items.update' },
        });
    }
}
```

Before writing `searchFields`, open `ITEMS_FILTER_SCHEMA` and use only fields present there with `type: 'string'` (e.g. `name`, `code`, `sku`) — `buildPrismaWhere` ignores unknown localized flags otherwise. Add `ItemsAiTools` to `providers` in `items.module.ts`.

- [ ] **Step 4: `parties.ai-tools.ts` (customers)**

```ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { PartiesService } from './parties.service';
import { CreatePartyDto, PartyTypeEnum, UpdatePartyDto, type PartyResponseDto } from './dto';
import { PARTIES_FILTER_SCHEMA } from './parties.controller';

const CUSTOMER_TYPES: string[] = [PartyTypeEnum.CUSTOMER, PartyTypeEnum.CUSTOMER_SUPPLIER];

@AiToolProvider()
@Injectable()
export class PartiesAiTools implements AiToolSource {
    constructor(private readonly parties: PartiesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'customers',
            resource: resources.parties.key,
            domain: 'parties',
            label: 'customer',
            service: this.parties,
            createDto: CreatePartyDto,
            updateDto: UpdatePartyDto,
            filterSchema: PARTIES_FILTER_SCHEMA,
            searchFields: ['name', 'code'],
            permissions: { view: 'parties.view', create: 'parties.create', update: 'parties.update' },
            scope: {
                listWhere: { type: { in: CUSTOMER_TYPES } },
                createDefaults: { type: PartyTypeEnum.CUSTOMER },
                omitInputFields: ['type', 'receivableAccountId', 'payableAccountId'],
                isInScope: (party: PartyResponseDto) => CUSTOMER_TYPES.includes(party.type),
            },
        });
    }
}
```

`receivableAccountId` / `payableAccountId` are omitted on purpose: they are GL control-account overrides (`.ai/rules/domain.md` §1) and stay a human decision in this spec. Confirm both field names in `CreatePartyDto` (lines 41–46 of `party.dto.ts`) and adjust the strings if they differ. Add `PartiesAiTools` to `providers` in `parties.module.ts`.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json` → exit 0.
Run: `pnpm --filter @devloggers/api lint` and `pnpm --filter @devloggers/api lint:architecture` → pass (the providers import only their own domain + `@devloggers/*`).
Start the API: log line `Registered 14 AI tools` (4 units + 4 items + 4 customers + 2 meta).

---

### Task 10: Contracts, OpenAPI regeneration, API client

**Files:**
- Modify: `packages/api-contracts/src/resources/ai.resource.ts`
- Delete: `packages/api-contracts/src/dto/ai-chat.dto.ts`; remove its line from `packages/api-contracts/src/dto/index.ts:22`
- Regenerate: `apps/api/openapi.yaml`, `packages/api-contracts/types/index.ts`
- Modify: `packages/api-client/src/infra/client.ts` (add `resolveRequestTarget`)
- Create: `packages/api-client/src/clients/ai-agent.client.ts`
- Modify: `packages/api-client/src/clients/index.ts`, `packages/api-client/src/api.ts`

**Interfaces:**
- Produces: `aiResource.routes = { model, conversations, conversation, messages, chat }`; `api.ai: AiAgentClient` with `listConversations(query?)`, `createConversation(body)`, `renameConversation(id, body)`, `deleteConversation(id)`, `listMessages(id, query?)`, `chatTarget(id): { url: string; headers: Record<string, string> }`; `ChatRequestBody = ApiRequestBody<typeof aiResource.routes.chat, 'post'>`.

- [ ] **Step 1: Regenerate the spec first** (new routes must exist before the resource references them)

Run: `pnpm generate`
Expected: `apps/api/openapi.yaml` contains `/ai/conversations`, `/ai/conversations/{id}`, `/ai/conversations/{id}/messages`, `/ai/conversations/{id}/chat`, `/ai/model`; the old `/ai/sessions*` paths are gone; api-contracts builds — it will fail on `ai.resource.ts` referencing removed routes; fix in Step 2 and rerun.

- [ ] **Step 2: Rewrite `ai.resource.ts`**

```ts
import { defineResource } from './resource.types'

export const aiResource = defineResource({
  key: 'ai',

  routes: {
    model: '/ai/model',
    conversations: '/ai/conversations',
    conversation: '/ai/conversations/{id}',
    messages: '/ai/conversations/{id}/messages',
    chat: '/ai/conversations/{id}/chat',
  },
})
```

Delete `packages/api-contracts/src/dto/ai-chat.dto.ts` and the `export * from './ai-chat.dto';` line.

Run: `pnpm --filter @devloggers/api-contracts build` → exit 0.

- [ ] **Step 3: `ApiClient.resolveRequestTarget`**

Add to `ApiClient` in `packages/api-client/src/infra/client.ts` (next to `postFormData`):

```ts
    /**
     * URL + default headers (auth, locale) for requests the typed client cannot
     * make itself — e.g. the AI chat SSE stream consumed by the AI SDK transport.
     */
    resolveRequestTarget(endpoint: string): { url: string; headers: Record<string, string> } {
        const headers = this.withDefaultHeaders()
        headers.delete("Accept")
        return {
            url: `${this.normalizeBaseUrl(this.baseUrl)}${endpoint}`,
            headers: Object.fromEntries(headers.entries()),
        }
    }
```

- [ ] **Step 4: `clients/ai-agent.client.ts`**

```ts
import { aiResource, type ApiQueryParams, type ApiRequestBody, type ApiResponse } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export type ChatRequestBody = ApiRequestBody<typeof aiResource.routes.chat, "post">

export class AiAgentClient {
    constructor(private readonly apiClient: ApiClient) {}

    listConversations = (
        query?: ApiQueryParams<typeof aiResource.routes.conversations, "get">,
    ): Promise<ApiResponse<typeof aiResource.routes.conversations, "get">> =>
        this.apiClient.get(aiResource.routes.conversations, { query })

    createConversation = (
        body: ApiRequestBody<typeof aiResource.routes.conversations, "post">,
    ): Promise<ApiResponse<typeof aiResource.routes.conversations, "post">> =>
        this.apiClient.post(aiResource.routes.conversations, body)

    renameConversation = (
        id: string,
        body: ApiRequestBody<typeof aiResource.routes.conversation, "patch">,
    ): Promise<ApiResponse<typeof aiResource.routes.conversation, "patch">> =>
        this.apiClient.patch(aiResource.routes.conversation, body, { params: { id } })

    deleteConversation = (id: string): Promise<ApiResponse<typeof aiResource.routes.conversation, "delete">> =>
        this.apiClient.delete(aiResource.routes.conversation, { params: { id } })

    listMessages = (
        id: string,
        query?: ApiQueryParams<typeof aiResource.routes.messages, "get">,
    ): Promise<ApiResponse<typeof aiResource.routes.messages, "get">> =>
        this.apiClient.get(aiResource.routes.messages, { params: { id }, query })

    /** Target for the AI SDK chat transport (SSE is not a typed JSON call). */
    chatTarget = (id: string): { url: string; headers: Record<string, string> } =>
        this.apiClient.resolveRequestTarget(aiResource.routes.chat.replace("{id}", encodeURIComponent(id)))
}
```

Check `ApiClient.get/post/patch/delete` signatures in `infra/client.ts` before writing: if `patch`/`delete` take `(endpoint, body, options)` / `(endpoint, options)` differently, follow the actual signature. Use the typed `params`; if it does not type-check, the generated path types are stale — rerun `pnpm generate`, do not cast.

- [ ] **Step 5: Register**

`packages/api-client/src/clients/index.ts`: add `export * from "./ai-agent.client"`.
`packages/api-client/src/api.ts`: import `AiAgentClient` and `aiResource`; add inside the returned object:

```ts
        [aiResource.key]: new AiAgentClient(client),
```

- [ ] **Step 6: Verify**

Run: `pnpm --filter @devloggers/api-contracts build && pnpm --filter @devloggers/api-client build` → both exit 0.
Run: `git diff --stat apps/api/openapi.yaml packages/api-contracts/types/index.ts` → both changed.

---

### Task 11: Dashboard — transport, data hooks, page and conversation list

**Files:**
- Modify: `apps/dashboard/package.json` (via pnpm)
- Create: `apps/dashboard/modules/ai-agent/transport/nest-chat-transport.ts`
- Create: `apps/dashboard/modules/ai-agent/ai-agent.types.ts`
- Create: `apps/dashboard/modules/ai-agent/hooks/use-conversations.ts`
- Create: `apps/dashboard/modules/ai-agent/hooks/use-conversation-history.ts`
- Create: `apps/dashboard/modules/ai-agent/hooks/use-agent-chat.ts`
- Create: `apps/dashboard/modules/ai-agent/components/ai-agent-page.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/conversation-list.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/chat-view.tsx`
- Create: `apps/dashboard/modules/ai-agent/index.ts`
- Create: `apps/dashboard/app/[locale]/(authenticated)/ai/page.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/ai/[conversationId]/page.tsx`

**Interfaces:**
- Consumes: `api.ai` (Task 10), stream contract (Task 8).
- Produces:
  - `createNestChatTransport(getTarget: () => { url: string; headers: Record<string, string> }): DefaultChatTransport<UIMessage>`
  - `buildChatRequestBody(messages: UIMessage[]): ChatRequestBody`
  - `useAgentChat({ conversationId, initialMessages })` → `UseChatHelpers<UIMessage>`
  - `useConversationHistory(conversationId)` → `{ initialMessages: UIMessage[] | undefined; olderMessages: UIMessage[]; loadOlder(): void; hasOlder: boolean; isLoadingOlder: boolean }`
  - `AiAgentPage({ conversationId?: string })`
  - `ToolMetaPart`, `isDynamicToolPart`, `findToolRisk(message, toolCallId)` in `ai-agent.types.ts`

- [ ] **Step 1: Install**

Run: `pnpm --filter @devloggers/dashboard add ai @ai-sdk/react @tanstack/react-virtual react-markdown remark-gfm`
Expected: `ai` 6.x, `@ai-sdk/react` 3.x.

- [ ] **Step 2: `ai-agent.types.ts`**

```ts
import type { DynamicToolUIPart, UIMessage } from "ai"

export type ToolRisk = "read" | "write" | "destructive"

type UIPart = UIMessage["parts"][number]

export function isDynamicToolPart(part: UIPart): part is DynamicToolUIPart {
    return part.type === "dynamic-tool"
}

/** Risk comes from the server's `data-toolMeta` part emitted next to each tool call. */
export function findToolRisk(message: UIMessage, toolCallId: string): ToolRisk {
    for (const part of message.parts) {
        if (part.type !== "data-toolMeta") continue
        const data = part.data
        if (data && typeof data === "object" && "toolCallId" in data && data.toolCallId === toolCallId && "risk" in data) {
            const risk = data.risk
            if (risk === "write" || risk === "destructive" || risk === "read") return risk
        }
    }
    return "read"
}

/** `units.update` → { resource: "units", op: "update" } */
export function splitToolName(toolName: string): { resource: string; op: string } {
    const [resource = toolName, op = ""] = toolName.split(".")
    return { resource, op }
}

export function hasPendingApproval(message: UIMessage | undefined): boolean {
    return !!message?.parts.some((part) => isDynamicToolPart(part) && part.state === "approval-requested")
}
```

- [ ] **Step 3: `transport/nest-chat-transport.ts`**

```ts
import { DefaultChatTransport, type UIMessage } from "ai"
import type { ChatRequestBody } from "@devloggers/api-client"
import { isDynamicToolPart } from "../ai-agent.types"

/** The server keeps the history; send only the new user text or the approval decisions. */
export function buildChatRequestBody(messages: UIMessage[]): ChatRequestBody {
    const last = messages[messages.length - 1]
    if (!last) throw new Error("No message to send")

    if (last.role === "user") {
        const text = last.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
        return { message: { id: last.id, text } }
    }

    const approvals = last.parts.flatMap((part) =>
        isDynamicToolPart(part) && part.state === "approval-responded"
            ? [{ toolCallId: part.toolCallId, approved: part.approval.approved, reason: part.approval.reason }]
            : [],
    )
    return { approvals }
}

export function createNestChatTransport(getTarget: () => { url: string; headers: Record<string, string> }) {
    return new DefaultChatTransport<UIMessage>({
        prepareSendMessagesRequest: ({ messages }) => {
            const target = getTarget()
            return { api: target.url, headers: target.headers, body: buildChatRequestBody(messages) }
        },
    })
}
```

If the installed `DefaultChatTransport` requires `api` at construction, pass `api: getTarget().url` too. `ChatRequestBody` must be exported from `@devloggers/api-client` (Task 10 Step 4–5).

- [ ] **Step 4: `hooks/use-conversations.ts`**

```ts
"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export const conversationKeys = {
    all: ["ai", "conversations"] as const,
    messages: (id: string) => ["ai", "conversations", id, "messages"] as const,
}

export function useConversations() {
    const api = useApi()
    return useInfiniteQuery({
        queryKey: conversationKeys.all,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => api.ai.listConversations({ cursor: pageParam, limit: 20 }),
        getNextPageParam: (last) => last.data.nextCursor ?? undefined,
    })
}

export function useConversationMutations() {
    const api = useApi()
    const queryClient = useQueryClient()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    return {
        create: useMutation({ mutationFn: () => api.ai.createConversation({}), onSuccess: invalidate }),
        rename: useMutation({
            mutationFn: (input: { id: string; title: string }) => api.ai.renameConversation(input.id, { title: input.title }),
            onSuccess: invalidate,
        }),
        remove: useMutation({ mutationFn: (id: string) => api.ai.deleteConversation(id), onSuccess: invalidate }),
    }
}
```

`useApi()` may return `Api | null` depending on the context type — follow how other modules handle it (e.g. `modules/units` hooks); if they use a non-null helper, use the same one.

- [ ] **Step 5: `hooks/use-conversation-history.ts`**

```ts
"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import type { UIMessage } from "ai"
import { useMemo } from "react"
import { useApi } from "@/shared/useApi"
import { conversationKeys } from "./use-conversations"

type StoredMessage = { id: string; role: "USER" | "ASSISTANT" | "SYSTEM"; parts: Record<string, unknown>[] }

const ROLE: Record<StoredMessage["role"], UIMessage["role"]> = { USER: "user", ASSISTANT: "assistant", SYSTEM: "system" }

function toUiMessage(message: StoredMessage): UIMessage {
    // Parts were produced by the AI SDK and stored verbatim by the API.
    return { id: message.id, role: ROLE[message.role], parts: message.parts as UIMessage["parts"] }
}

/**
 * Page 1 (newest) seeds useChat; later pages are older history prepended above it.
 * Pages arrive newest-first and are reversed to chronological order here.
 */
export function useConversationHistory(conversationId: string) {
    const api = useApi()
    const query = useInfiniteQuery({
        queryKey: conversationKeys.messages(conversationId),
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => api.ai.listMessages(conversationId, { cursor: pageParam, limit: 30 }),
        getNextPageParam: (last) => last.data.nextCursor ?? undefined,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    })

    const pages = query.data?.pages ?? []
    const initialMessages = useMemo(
        () => (pages[0] ? pages[0].data.items.map(toUiMessage).reverse() : undefined),
        // Only the first page seeds useChat; later pages must not reset it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pages.length > 0],
    )
    const olderMessages = useMemo(
        () => pages.slice(1).flatMap((page) => page.data.items.map(toUiMessage)).reverse(),
        [pages],
    )

    return {
        initialMessages,
        olderMessages,
        loadOlder: () => void query.fetchNextPage(),
        hasOlder: query.hasNextPage,
        isLoadingOlder: query.isFetchingNextPage,
    }
}
```

`parts` typed `Record<string, unknown>[]` from OpenAPI → `UIMessage["parts"]`: this is the one boundary where the API intentionally carries SDK-owned JSON; the cast is on SDK data round-tripped verbatim, not on an API DTO shape. If lint forbids it, add a type guard that checks each part has a string `type` and use it with `filter`.

- [ ] **Step 6: `hooks/use-agent-chat.ts`**

```ts
"use client"

import { useChat } from "@ai-sdk/react"
import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai"
import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { createNestChatTransport } from "../transport/nest-chat-transport"
import { conversationKeys } from "./use-conversations"

export function useAgentChat({ conversationId, initialMessages }: { conversationId: string; initialMessages: UIMessage[] }) {
    const api = useApi()
    const queryClient = useQueryClient()
    const transport = useMemo(() => createNestChatTransport(() => api.ai.chatTarget(conversationId)), [api, conversationId])

    return useChat<UIMessage>({
        id: conversationId,
        messages: initialMessages,
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        onFinish: () => void queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
    })
}
```

- [ ] **Step 7: `components/conversation-list.tsx`**

```tsx
"use client"

import { MoreHorizontalIcon, PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { confirm } from "@/shared/components/confirm-dialog"
import { cn } from "@/shared/lib/utils"
import { useConversationMutations, useConversations } from "../hooks/use-conversations"

export function ConversationList({ activeId }: { activeId?: string }) {
    const t = useTranslations("business.aiAgent")
    const router = useRouter()
    const conversations = useConversations()
    const { create, rename, remove } = useConversationMutations()
    const items = conversations.data?.pages.flatMap((page) => page.data.items) ?? []

    const onNew = async () => {
        const created = await create.mutateAsync()
        router.push(`/ai/${created.data.id}`)
    }

    const onRename = (id: string, current: string | null) => {
        const title = window.prompt(t("renamePrompt"), current ?? "")
        if (title?.trim()) rename.mutate({ id, title: title.trim() })
    }

    const onDelete = async (id: string) => {
        const ok = await confirm({ title: t("deleteTitle"), description: t("deleteDescription"), variant: "destructive" })
        if (!ok) return
        await remove.mutateAsync(id)
        if (id === activeId) router.push("/ai")
    }

    return (
        <aside className="flex h-full w-full flex-col gap-2 border-e p-2 md:w-72">
            <Button onClick={onNew} disabled={create.isPending} className="w-full justify-start gap-2">
                <PlusIcon className="size-4" />
                {t("newConversation")}
            </Button>
            <nav className="flex-1 overflow-y-auto">
                {items.length === 0 && !conversations.isLoading && (
                    <p className="p-3 text-sm text-muted-foreground">{t("noConversations")}</p>
                )}
                {items.map((conversation) => (
                    <div
                        key={conversation.id}
                        className={cn(
                            "group flex items-center gap-1 rounded-md pe-1 hover:bg-muted",
                            conversation.id === activeId && "bg-muted",
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => router.push(`/ai/${conversation.id}`)}
                            className="flex-1 truncate px-3 py-2 text-start text-sm"
                        >
                            {conversation.title ?? t("untitled")}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100" aria-label={t("actions")}>
                                    <MoreHorizontalIcon className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onRename(conversation.id, conversation.title)}>{t("rename")}</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => void onDelete(conversation.id)}>
                                    {t("delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                {conversations.hasNextPage && (
                    <Button variant="ghost" className="w-full" onClick={() => void conversations.fetchNextPage()}>
                        {t("loadMore")}
                    </Button>
                )}
            </nav>
        </aside>
    )
}
```

Check the actual `cn` import path (`grep -rn "export function cn" apps/dashboard/shared`) and whether `DropdownMenuItem` supports `variant="destructive"` in this repo's `ui/dropdown-menu.tsx`; if not, use `className="text-destructive"`. `window.prompt` keeps rename minimal; replacing it with a dialog is out of scope.

- [ ] **Step 8: `components/chat-view.tsx`** (MessageList/Composer come in Task 12 — create this file now with them imported)

```tsx
"use client"

import type { UIMessage } from "ai"
import { useMemo } from "react"
import { useAgentChat } from "../hooks/use-agent-chat"
import { useConversationHistory } from "../hooks/use-conversation-history"
import { hasPendingApproval } from "../ai-agent.types"
import { MessageList } from "./message-list"
import { Composer } from "./composer"

function ChatSession({
    conversationId,
    initialMessages,
    history,
}: {
    conversationId: string
    initialMessages: UIMessage[]
    history: ReturnType<typeof useConversationHistory>
}) {
    const chat = useAgentChat({ conversationId, initialMessages })
    const seen = useMemo(() => new Set(chat.messages.map((message) => message.id)), [chat.messages])
    const messages = useMemo(
        () => [...history.olderMessages.filter((message) => !seen.has(message.id)), ...chat.messages],
        [history.olderMessages, chat.messages, seen],
    )
    const busy = chat.status === "submitted" || chat.status === "streaming"
    const pending = hasPendingApproval(chat.messages[chat.messages.length - 1])

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <MessageList
                messages={messages}
                isStreaming={busy}
                hasOlder={history.hasOlder}
                isLoadingOlder={history.isLoadingOlder}
                onLoadOlder={history.loadOlder}
                onApprovalResponse={chat.addToolApprovalResponse}
                error={chat.error}
            />
            <Composer
                disabled={pending}
                busy={busy}
                onSend={(text) => void chat.sendMessage({ text })}
                onStop={() => void chat.stop()}
            />
        </div>
    )
}

export function ChatView({ conversationId }: { conversationId: string }) {
    const history = useConversationHistory(conversationId)
    if (!history.initialMessages) return <div className="flex-1" />
    return (
        <ChatSession key={conversationId} conversationId={conversationId} initialMessages={history.initialMessages} history={history} />
    )
}
```

- [ ] **Step 9: `components/ai-agent-page.tsx`**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"

export function AiAgentPage({ conversationId }: { conversationId?: string }) {
    const t = useTranslations("business.aiAgent")
    return (
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col md:flex-row">
            <div className={conversationId ? "hidden md:flex" : "flex flex-1 md:flex-none"}>
                <ConversationList activeId={conversationId} />
            </div>
            {conversationId ? (
                <ChatView conversationId={conversationId} />
            ) : (
                <div className="hidden flex-1 items-center justify-center text-muted-foreground md:flex">{t("emptyState")}</div>
            )}
        </div>
    )
}
```

Adjust `h-[calc(100dvh-4rem)]` to the authenticated layout's header height (check `app/[locale]/(authenticated)/layout.tsx`).

- [ ] **Step 10: Barrel + thin routes**

`apps/dashboard/modules/ai-agent/index.ts`:

```ts
export { AiAgentPage } from "./components/ai-agent-page"
```

`apps/dashboard/app/[locale]/(authenticated)/ai/page.tsx`:

```tsx
import { AiAgentPage } from "@/modules/ai-agent"

export default function Page() {
    return <AiAgentPage />
}
```

`apps/dashboard/app/[locale]/(authenticated)/ai/[conversationId]/page.tsx`:

```tsx
import { AiAgentPage } from "@/modules/ai-agent"

export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
    const { conversationId } = await params
    return <AiAgentPage conversationId={conversationId} />
}
```

- [ ] **Step 11: Verify** — run after Task 12 (this task's files import Task 12 components).

---

### Task 12: Dashboard — virtualized message list, parts, approval card, composer

**Files:**
- Create: `apps/dashboard/modules/ai-agent/components/message-list.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/message-item.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/parts/text-part.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/parts/tool-call-card.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/parts/tool-approval-card.tsx`
- Create: `apps/dashboard/modules/ai-agent/components/composer.tsx`

**Interfaces:**
- Consumes: `isDynamicToolPart`, `findToolRisk`, `splitToolName` (Task 11); `UseChatHelpers['addToolApprovalResponse']`.
- Produces: `MessageList` props `{ messages: UIMessage[]; isStreaming: boolean; hasOlder: boolean; isLoadingOlder: boolean; onLoadOlder(): void; onApprovalResponse: (r: { id: string; approved: boolean; reason?: string }) => void; error?: Error }`; `Composer` props `{ disabled: boolean; busy: boolean; onSend(text: string): void; onStop(): void }`.

- [ ] **Step 1: `parts/text-part.tsx`**

```tsx
"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function TextPart({ text }: { text: string }) {
    return (
        <div className="prose prose-sm max-w-none dark:prose-invert [&_table]:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
    )
}
```

If `@tailwindcss/typography` (`prose`) is not configured in the dashboard, replace `prose…` classes with `space-y-2 text-sm leading-relaxed` — do not add a Tailwind plugin in this task.

- [ ] **Step 2: `parts/tool-call-card.tsx`**

```tsx
"use client"

import type { DynamicToolUIPart } from "ai"
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { splitToolName } from "../../ai-agent.types"

function describeOutput(output: unknown): string {
    if (output && typeof output === "object" && "total" in output && typeof output.total === "number") {
        return String(output.total)
    }
    return ""
}

export function ToolCallCard({ part }: { part: DynamicToolUIPart }) {
    const t = useTranslations("business.aiAgent")
    const { resource, op } = splitToolName(part.toolName)
    const label = t("toolLabel", { op: t(`ops.${op}`), resource: t(`resources.${resource}`) })

    return (
        <details className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <summary className="flex cursor-pointer items-center gap-2">
                {part.state === "output-available" && <CheckCircle2Icon className="size-4 text-primary" />}
                {part.state === "output-error" && <AlertCircleIcon className="size-4 text-destructive" />}
                {part.state === "output-denied" && <XCircleIcon className="size-4 text-muted-foreground" />}
                {(part.state === "input-streaming" || part.state === "input-available" || part.state === "approval-responded") && (
                    <Loader2Icon className="size-4 animate-spin" />
                )}
                <span className="font-medium">{label}</span>
                {part.state === "output-available" && describeOutput(part.output) && (
                    <span className="text-muted-foreground">· {t("resultCount", { count: describeOutput(part.output) })}</span>
                )}
                {part.state === "output-denied" && <span className="text-muted-foreground">· {t("rejected")}</span>}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-background p-2 text-xs" dir="ltr">
                {JSON.stringify(part.state === "output-available" ? part.output : part.state === "output-error" ? part.errorText : part.input, null, 2)}
            </pre>
        </details>
    )
}
```

- [ ] **Step 3: `parts/tool-approval-card.tsx`**

```tsx
"use client"

import type { DynamicToolUIPart } from "ai"
import { useQuery } from "@tanstack/react-query"
import { ShieldAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"
import { useApi } from "@/shared/useApi"
import type { Api } from "@devloggers/api-client"
import { splitToolName, type ToolRisk } from "../../ai-agent.types"

/** Current values for the before → after diff of `<resource>.update` tools. */
const CURRENT_VALUE_FETCHERS: Record<string, (api: Api, id: string) => Promise<unknown>> = {
    units: (api, id) => api.units.show(id),
    items: (api, id) => api.items.show(id),
    customers: (api, id) => api.parties.show(id),
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—"
    return typeof value === "object" ? JSON.stringify(value) : String(value)
}

type ApprovalResponse = { id: string; approved: boolean; reason?: string }

export function ToolApprovalCard({
    part,
    risk,
    onRespond,
}: {
    part: DynamicToolUIPart & { state: "approval-requested" }
    risk: ToolRisk
    onRespond: (response: ApprovalResponse) => void
}) {
    const t = useTranslations("business.aiAgent")
    const api = useApi()
    const [armed, setArmed] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [reason, setReason] = useState("")
    const { resource, op } = splitToolName(part.toolName)
    const input = (part.input ?? {}) as Record<string, unknown>
    const id = typeof input.id === "string" ? input.id : undefined
    const fetchCurrent = op === "update" && id ? CURRENT_VALUE_FETCHERS[resource] : undefined

    const current = useQuery({
        queryKey: ["ai", "approval-current", resource, id],
        queryFn: () => fetchCurrent!(api, id!),
        enabled: !!fetchCurrent,
    })
    const before = unwrapApiData<Record<string, unknown>>(current.data)
    const destructive = risk === "destructive"

    const approve = () => {
        if (destructive && !armed) return setArmed(true)
        onRespond({ id: part.approval.id, approved: true })
    }

    return (
        <div className={cn("rounded-lg border p-3 text-sm", destructive ? "border-destructive bg-destructive/5" : "border-primary/40 bg-primary/5")}>
            <div className="mb-2 flex items-center gap-2 font-medium">
                <ShieldAlertIcon className={cn("size-4", destructive ? "text-destructive" : "text-primary")} />
                {t("approvalTitle", { op: t(`ops.${op}`), resource: t(`resources.${resource}`) })}
            </div>
            <table className="w-full text-xs">
                <tbody>
                    {Object.entries(input)
                        .filter(([key]) => key !== "id")
                        .map(([key, value]) => (
                            <tr key={key} className="border-t">
                                <td className="py-1 pe-2 font-medium text-muted-foreground">{key}</td>
                                {fetchCurrent && <td className="py-1 pe-2 line-through opacity-60" dir="auto">{formatValue(before[key])}</td>}
                                <td className="py-1" dir="auto">{formatValue(value)}</td>
                            </tr>
                        ))}
                </tbody>
            </table>
            {rejecting ? (
                <div className="mt-3 flex flex-col gap-2">
                    <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("rejectReasonPlaceholder")} rows={2} />
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => onRespond({ id: part.approval.id, approved: false, reason: reason.trim() || undefined })}>
                            {t("confirmReject")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                            {t("cancel")}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-3 flex gap-2">
                    <Button size="sm" variant={destructive ? "destructive" : "default"} onClick={approve}>
                        {destructive && armed ? t("confirmDestructive") : t("approve")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
                        {t("reject")}
                    </Button>
                </div>
            )}
        </div>
    )
}
```

Verify `api.units` / `api.items` / `api.parties` are the registered keys in `createApi()` (`unitResource.key` = `units`, `itemResource.key` = `items`, `partyResource.key` = `parties`), and that `Api` is exported from `@devloggers/api-client`. The `input` narrowing (`as Record<string, unknown>`) is on model-generated tool input (SDK `unknown`), not an API DTO.

- [ ] **Step 4: `message-item.tsx`**

```tsx
"use client"

import type { UIMessage } from "ai"
import { memo } from "react"
import { cn } from "@/shared/lib/utils"
import { findToolRisk, isDynamicToolPart } from "../ai-agent.types"
import { TextPart } from "./parts/text-part"
import { ToolCallCard } from "./parts/tool-call-card"
import { ToolApprovalCard } from "./parts/tool-approval-card"

type ApprovalResponse = { id: string; approved: boolean; reason?: string }

function MessageItemBase({ message, onApprovalResponse }: { message: UIMessage; onApprovalResponse: (response: ApprovalResponse) => void }) {
    const isUser = message.role === "user"
    return (
        <div className={cn("flex w-full px-4 py-2", isUser ? "justify-end" : "justify-start")}>
            <div className={cn("flex max-w-[min(48rem,90%)] flex-col gap-2", isUser && "rounded-2xl bg-primary px-4 py-2 text-primary-foreground")}>
                {message.parts.map((part, index) => {
                    if (part.type === "text") return <TextPart key={index} text={part.text} />
                    if (isDynamicToolPart(part)) {
                        if (part.state === "approval-requested") {
                            return (
                                <ToolApprovalCard
                                    key={part.toolCallId}
                                    part={part}
                                    risk={findToolRisk(message, part.toolCallId)}
                                    onRespond={onApprovalResponse}
                                />
                            )
                        }
                        return <ToolCallCard key={part.toolCallId} part={part} />
                    }
                    return null
                })}
            </div>
        </div>
    )
}

/** useChat replaces only the changed message object, so reference equality skips unchanged rows while streaming. */
export const MessageItem = memo(MessageItemBase)
```

If TypeScript does not narrow `part` to `approval-requested` inside the `if`, extract a type guard `(p): p is DynamicToolUIPart & { state: "approval-requested" } => p.state === "approval-requested"`.

- [ ] **Step 5: `message-list.tsx`** (virtualized)

```tsx
"use client"

import type { UIMessage } from "ai"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDownIcon, Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { MessageItem } from "./message-item"

const BOTTOM_THRESHOLD_PX = 80
const TOP_LOAD_THRESHOLD_PX = 200

type ApprovalResponse = { id: string; approved: boolean; reason?: string }

type Props = {
    messages: UIMessage[]
    isStreaming: boolean
    hasOlder: boolean
    isLoadingOlder: boolean
    onLoadOlder: () => void
    onApprovalResponse: (response: ApprovalResponse) => void
    error?: Error
}

/** Changes whenever the last message grows (streamed text, new part, state change). */
function tailSignature(messages: UIMessage[]): string {
    const last = messages[messages.length - 1]
    if (!last) return ""
    const lastPart = last.parts[last.parts.length - 1]
    const size = lastPart?.type === "text" ? lastPart.text.length : 0
    const state = lastPart && "state" in lastPart ? String(lastPart.state) : ""
    return `${last.id}:${last.parts.length}:${size}:${state}`
}

export function MessageList({ messages, isStreaming, hasOlder, isLoadingOlder, onLoadOlder, onApprovalResponse, error }: Props) {
    const t = useTranslations("business.aiAgent")
    const scrollRef = useRef<HTMLDivElement>(null)
    const atBottomRef = useRef(true)
    const [showJump, setShowJump] = useState(false)
    const anchorRef = useRef<{ id: string; delta: number } | null>(null)

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 120,
        overscan: 6,
        getItemKey: (index) => messages[index].id,
    })

    const scrollToBottom = useCallback(() => {
        if (messages.length > 0) virtualizer.scrollToIndex(messages.length - 1, { align: "end" })
    }, [messages.length, virtualizer])

    // Stick to bottom while new content arrives, unless the user scrolled up.
    const signature = tailSignature(messages)
    useEffect(() => {
        if (atBottomRef.current) scrollToBottom()
        else setShowJump(true)
    }, [signature, scrollToBottom])

    // Keep the first visible message in place when older pages are prepended.
    useLayoutEffect(() => {
        const anchor = anchorRef.current
        if (!anchor) return
        const index = messages.findIndex((message) => message.id === anchor.id)
        if (index > 0) {
            const [offset] = virtualizer.getOffsetForIndex(index, "start") ?? [0]
            virtualizer.scrollToOffset(offset + anchor.delta)
        }
        anchorRef.current = null
    }, [messages, virtualizer])

    const onScroll = () => {
        const el = scrollRef.current
        if (!el) return
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX
        atBottomRef.current = atBottom
        if (atBottom) setShowJump(false)
        if (el.scrollTop < TOP_LOAD_THRESHOLD_PX && hasOlder && !isLoadingOlder) {
            const first = virtualizer.getVirtualItems()[0]
            if (first) anchorRef.current = { id: messages[first.index].id, delta: el.scrollTop - first.start }
            onLoadOlder()
        }
    }

    return (
        <div className="relative min-h-0 flex-1">
            <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto" role="log" aria-live="polite">
                {isLoadingOlder && (
                    <div className="flex justify-center py-2">
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {messages.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t("startHint")}</p>}
                <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                    {virtualizer.getVirtualItems().map((row) => (
                        <div
                            key={row.key}
                            data-index={row.index}
                            ref={virtualizer.measureElement}
                            className="absolute inset-x-0 top-0"
                            style={{ transform: `translateY(${row.start}px)` }}
                        >
                            <MessageItem message={messages[row.index]} onApprovalResponse={onApprovalResponse} />
                        </div>
                    ))}
                </div>
                {isStreaming && (
                    <div className="px-4 py-2">
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {error && <p className="px-4 py-2 text-sm text-destructive">{t("streamError")}</p>}
            </div>
            {showJump && (
                <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 gap-1 shadow"
                    onClick={() => {
                        atBottomRef.current = true
                        setShowJump(false)
                        scrollToBottom()
                    }}
                >
                    <ArrowDownIcon className="size-4" />
                    {t("newMessages")}
                </Button>
            )}
        </div>
    )
}
```

`virtualizer.getOffsetForIndex` exists in `@tanstack/virtual-core` v3 and returns `[offset, align] | undefined`; if the installed version differs, use `virtualizer.scrollToIndex(index, { align: "start" })` followed by `virtualizer.scrollBy(anchor.delta)` in a `requestAnimationFrame`.

- [ ] **Step 6: `composer.tsx`**

```tsx
"use client"

import { SendIcon, SquareIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, type KeyboardEvent } from "react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"

const MAX_LENGTH = 8000

export function Composer({ disabled, busy, onSend, onStop }: { disabled: boolean; busy: boolean; onSend: (text: string) => void; onStop: () => void }) {
    const t = useTranslations("business.aiAgent")
    const [text, setText] = useState("")
    const canSend = !disabled && !busy && text.trim().length > 0

    const send = () => {
        if (!canSend) return
        onSend(text.trim())
        setText("")
    }

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            send()
        }
    }

    return (
        <div className="border-t p-3">
            {disabled && <p className="mb-2 text-xs text-muted-foreground">{t("pendingApprovalHint")}</p>}
            <div className="flex items-end gap-2">
                <Textarea
                    value={text}
                    onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
                    onKeyDown={onKeyDown}
                    placeholder={t("composerPlaceholder")}
                    disabled={disabled}
                    rows={1}
                    className="max-h-40 min-h-10 resize-none"
                    dir="auto"
                />
                {busy ? (
                    <Button size="icon" variant="secondary" onClick={onStop} aria-label={t("stop")}>
                        <SquareIcon className="size-4" />
                    </Button>
                ) : (
                    <Button size="icon" onClick={send} disabled={!canSend} aria-label={t("send")}>
                        <SendIcon className="size-4 rtl:-scale-x-100" />
                    </Button>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 7: Verify (Tasks 11 + 12)**

Run: `pnpm --filter @devloggers/dashboard lint` → exit 0.
Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit` → exit 0.

---

### Task 13: i18n and navigation

**Files:**
- Modify: `packages/i18n/src/en/business.json`, `packages/i18n/src/ar/business.json`, `packages/i18n/src/tr/business.json`
- Modify: `apps/dashboard/config/navGroups.tsx:50-53`

**Interfaces:**
- Produces: `business.aiAgent.*` keys used in Tasks 11–12.

- [ ] **Step 1: Nav**

In `apps/dashboard/config/navGroups.tsx` change the AI item's `href: "/ai/chat"` to `href: "/ai"` (keep `titleKey: "business.navigation.items.aiAssistant"`, `permission: "ai.view"`).

- [ ] **Step 2: English — add top-level `aiAgent` to `packages/i18n/src/en/business.json`**

```json
"aiAgent": {
  "newConversation": "New conversation",
  "noConversations": "No conversations yet",
  "untitled": "Untitled conversation",
  "actions": "Conversation actions",
  "rename": "Rename",
  "renamePrompt": "Conversation title",
  "delete": "Delete",
  "deleteTitle": "Delete this conversation?",
  "deleteDescription": "Its messages will be permanently removed.",
  "loadMore": "Load more",
  "emptyState": "Select a conversation or start a new one",
  "startHint": "Ask the assistant to find, create or update records.",
  "composerPlaceholder": "Message the assistant…",
  "send": "Send",
  "stop": "Stop",
  "pendingApprovalHint": "Approve or reject the pending action to continue.",
  "newMessages": "New messages",
  "streamError": "The assistant could not respond. Try again.",
  "toolLabel": "{op} {resource}",
  "resultCount": "{count} results",
  "rejected": "rejected",
  "approvalTitle": "Confirm: {op} {resource}",
  "approve": "Approve",
  "confirmDestructive": "Click again to confirm",
  "reject": "Reject",
  "confirmReject": "Reject action",
  "rejectReasonPlaceholder": "Reason (optional)",
  "cancel": "Cancel",
  "ops": {
    "list": "List",
    "show": "View",
    "create": "Create",
    "update": "Update",
    "delete": "Delete",
    "search": "Search",
    "load": "Load"
  },
  "resources": {
    "units": "units",
    "items": "items",
    "customers": "customers",
    "tools": "tools"
  }
}
```

- [ ] **Step 3: Arabic — `packages/i18n/src/ar/business.json`**

Note: `ar/business.json` already has an `aiAssistant` object at line 1152 — leave it untouched (it belongs to the old page copy; remove only if nothing references it: `grep -rn "aiAssistant\." apps/dashboard` returns nothing → delete it in all locales where present).

```json
"aiAgent": {
  "newConversation": "محادثة جديدة",
  "noConversations": "لا توجد محادثات بعد",
  "untitled": "محادثة بدون عنوان",
  "actions": "إجراءات المحادثة",
  "rename": "إعادة تسمية",
  "renamePrompt": "عنوان المحادثة",
  "delete": "حذف",
  "deleteTitle": "حذف هذه المحادثة؟",
  "deleteDescription": "سيتم حذف رسائلها نهائياً.",
  "loadMore": "تحميل المزيد",
  "emptyState": "اختر محادثة أو ابدأ محادثة جديدة",
  "startHint": "اطلب من المساعد البحث عن السجلات أو إنشاءها أو تعديلها.",
  "composerPlaceholder": "اكتب رسالة للمساعد…",
  "send": "إرسال",
  "stop": "إيقاف",
  "pendingApprovalHint": "وافق على الإجراء المعلّق أو ارفضه للمتابعة.",
  "newMessages": "رسائل جديدة",
  "streamError": "تعذّر على المساعد الرد. حاول مرة أخرى.",
  "toolLabel": "{op} {resource}",
  "resultCount": "{count} نتيجة",
  "rejected": "مرفوض",
  "approvalTitle": "تأكيد: {op} {resource}",
  "approve": "موافقة",
  "confirmDestructive": "انقر مرة أخرى للتأكيد",
  "reject": "رفض",
  "confirmReject": "رفض الإجراء",
  "rejectReasonPlaceholder": "السبب (اختياري)",
  "cancel": "إلغاء",
  "ops": {
    "list": "عرض قائمة",
    "show": "عرض",
    "create": "إنشاء",
    "update": "تعديل",
    "delete": "حذف",
    "search": "بحث",
    "load": "تحميل"
  },
  "resources": {
    "units": "الوحدات",
    "items": "المواد",
    "customers": "العملاء",
    "tools": "الأدوات"
  }
}
```

- [ ] **Step 4: Turkish — `packages/i18n/src/tr/business.json`**

```json
"aiAgent": {
  "newConversation": "Yeni sohbet",
  "noConversations": "Henüz sohbet yok",
  "untitled": "Başlıksız sohbet",
  "actions": "Sohbet işlemleri",
  "rename": "Yeniden adlandır",
  "renamePrompt": "Sohbet başlığı",
  "delete": "Sil",
  "deleteTitle": "Bu sohbet silinsin mi?",
  "deleteDescription": "Mesajları kalıcı olarak silinecek.",
  "loadMore": "Daha fazla yükle",
  "emptyState": "Bir sohbet seçin veya yeni bir sohbet başlatın",
  "startHint": "Asistandan kayıt bulmasını, oluşturmasını veya güncellemesini isteyin.",
  "composerPlaceholder": "Asistana mesaj yazın…",
  "send": "Gönder",
  "stop": "Durdur",
  "pendingApprovalHint": "Devam etmek için bekleyen işlemi onaylayın veya reddedin.",
  "newMessages": "Yeni mesajlar",
  "streamError": "Asistan yanıt veremedi. Tekrar deneyin.",
  "toolLabel": "{op} {resource}",
  "resultCount": "{count} sonuç",
  "rejected": "reddedildi",
  "approvalTitle": "Onayla: {op} {resource}",
  "approve": "Onayla",
  "confirmDestructive": "Onaylamak için tekrar tıklayın",
  "reject": "Reddet",
  "confirmReject": "İşlemi reddet",
  "rejectReasonPlaceholder": "Neden (isteğe bağlı)",
  "cancel": "İptal",
  "ops": {
    "list": "Listele",
    "show": "Görüntüle",
    "create": "Oluştur",
    "update": "Güncelle",
    "delete": "Sil",
    "search": "Ara",
    "load": "Yükle"
  },
  "resources": {
    "units": "birimler",
    "items": "ürünler",
    "customers": "müşteriler",
    "tools": "araçlar"
  }
}
```

- [ ] **Step 5: Verify**

Run: `node -e "for (const l of ['en','ar','tr']) { const j=require('./packages/i18n/src/'+l+'/business.json'); if(!j.aiAgent) throw new Error(l); console.log(l, Object.keys(j.aiAgent).length) }"`
Expected: three lines, each `30` keys (same count in all locales).
If `packages/i18n` has a build/typegen step (`grep -n "\"build\"" packages/i18n/package.json`), run it.

---

### Task 14: Full verification and manual smoke test

**Files:** none (verification only).

- [ ] **Step 1: Regenerate + build everything touched**

```bash
pnpm generate
pnpm --filter @devloggers/backend-core build
pnpm --filter @devloggers/api-contracts build
pnpm --filter @devloggers/api-client build
pnpm --filter @devloggers/db-prisma typecheck
pnpm --filter @devloggers/api lint
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/dashboard lint
pnpm turbo run build --filter=@devloggers/api --filter=@devloggers/dashboard
```

Expected: every command exits 0; `pnpm --filter @devloggers/api test` reports the same pass count as before the change minus none (existing suites green — `manifest.spec.ts` updated in Task 4).

- [ ] **Step 2: Manual smoke test** (`pnpm dev`, real `OPENAI_API_KEY`, log in as an admin)

- [ ] `/ai` → "New conversation" → "List my units" → streamed reply + a `List units` card, no approval
- [ ] "Create a unit Box, abbreviation bx" → approval card → Approve → unit visible in `/catalog/units`; `audit_logs` row with `source = 'AI_AGENT'`
- [ ] "Rename unit Box to Crate" → diff card shows old → new → Reject with a reason → no change; assistant acknowledges and does not retry
- [ ] Trigger an approval, reload the page → the card is still there and Approve works
- [ ] Log in as a user whose role lacks `units.create` → agent says it cannot create units
- [ ] Open another tenant's conversation URL → 404 / empty
- [ ] Send ~100 messages (or seed 200 `ai_messages` rows) → smooth scroll; scrolling to top loads older messages without jumping
- [ ] Switch to Arabic → RTL layout, Arabic replies, jump pill centred
- [ ] Stop button mid-stream → reload → the assistant message is stored complete
- [ ] "Delete the unit Crate" → agent explains it has no delete tool (none registered)

- [ ] **Step 3: Report**

Summarize to the user: files changed (`git status --short`), verification output, smoke-test results (pass/fail per line), and remaining follow-ups (migration applied or deferred, env vars set, model name chosen). Do not commit.
