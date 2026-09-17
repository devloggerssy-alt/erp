# Phase 7 — Audit, Reconciliation & Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-08-20-erp-roadmap/phase-07-audit-reconciliation-observability.md`](../specs/2026-08-20-erp-roadmap/phase-07-audit-reconciliation-observability.md)

## Task 0 — decisions recorded (approved 2026-09-17)

All four Task 0 questions were answered; Task 1 may proceed.

| # | Decision | Answer |
|---|----------|--------|
| Q4 | AuditLog retention | **Retain indefinitely in Phase 7; no purge job.** A future purge must never delete `source = 'GL'` rows and must run as an explicit `DELETE` (the trigger blocks only `UPDATE`). Nothing here depends on shorter retention. |
| — | New dependency `@nestjs/schedule` | **Approved.** |
| Deviation 2 | Atomic GL audit (inside the posting transaction; HTTP audit stays best-effort) | **Approved.** |
| — | Check 2 derivation change (journal-line subledger) + new baseline | **Approved.** `docs/drift-baseline.json` is no longer comparable; Task 15 records `docs/drift-baseline-phase-7.json`. |

**Goal:** Every mutation writes an `AuditLog` row, GL events are audited atomically with the posting, all 8 checks in the reconciliation stack run, and a daily job flags any drift that is new since the last run.

**Architecture:** A request-scoped `AsyncLocalStorage` context carries a correlation id, the actor and the source. The JSON logger, the audit writer and reconciliation runs all read from it. HTTP mutations are audited by a global `AuditInterceptor` on a best-effort basis: a failed audit write is logged and the request still succeeds. GL events (journal post/reverse, opening session post/lock, fiscal period status changes) are audited explicitly by their domain services. The existing `BalanceDriftService` gains checks 6 and 8, and its checks 2 and 3 are rebuilt on journal-line subledgers. A new `BusinessSetupReconciliationService` maps the report onto the 8 numbered checks. `ReconciliationMonitorService` saves each run to `ReconciliationRun` and raises an alert when drift appears or grows compared with the previous run. `@nestjs/schedule` triggers it daily for every tenant.

**Tech Stack:** NestJS 11.1 (`ConsoleLogger` JSON mode, interceptors, `@nestjs/event-emitter`), `@nestjs/schedule` (new — approval gate in Task 0), Prisma + PostgreSQL (`$queryRaw` tagged templates, plpgsql trigger), Jest + ts-jest (Prisma-stub unit tests, the existing convention in `balance-drift.service.spec.ts`).

## What already exists (verified 2026-09-17 — do not rebuild)

| Spec item | Current state |
|-----------|---------------|
| `AuditLog` model | `packages/db-prisma/src/schema/audit.prisma` — no `source` / `correlationId` / `metadata` columns |
| Audit writes | **None.** `AuditService.log()` exists (untyped `any`) but has zero callers. `AuditController` is GET-only. |
| Check 1 — Cash GL vs cashbox subledger | ✅ `BalanceDriftService.checkCashSubledgers` |
| Check 2 — Cashbox subledger vs `Cashbox.balance` | ⚠️ `checkCashboxes` derives from payment/expense **documents** plus openings, not the journal-line subledger. Rebuilt in Task 9. |
| Check 3 — Bank GL vs bank subledger | ✅ `checkBankSubledgers`; ⚠️ `checkBankAccounts` compares base-currency Σ(debit−credit) to a transaction-currency column. Fixed in Task 9. |
| Checks 4–5 — AR/AP control vs party | ✅ `checkPartySubledgers` (AR and AP mixed in one list; Task 10 adds `side`) |
| Check 6 — Inventory GL vs stock valuation | ❌ missing (Task 10) |
| Check 7 — JE balance | ✅ `checkJournalEntryBalance` |
| Check 8 — txn × rate = base | ❌ missing (Task 10). **Blocker found:** `OpeningStockPolicy` and `StockCountAdjustedPolicy` never set `amount`/`exchangeRate`, so every such line would fail check 8. Fixed in Task 8. |
| Structured logging / correlation id | ❌ none (no middleware, no `AsyncLocalStorage`, default text logger) |
| Scheduler | ❌ `@nestjs/schedule` not installed |
| `SetupTask` / `BUSINESS_SETUP` / `RECONCILIATION` task | ❌ Phase 6 not started |

## Deviations from the spec (each needs sign-off in Task 0)

1. **7.1.4 and 7.5.3 ship as hooks, not integrations.** Phase 6 (`SetupTask`) does not exist yet. This plan provides `RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType } }, fn)`, which Task 4 tests end to end, and `ReconciliationMonitorService.runForTenant(tenantId, 'BUSINESS_SETUP')`. Phase 6 calls these. The done-when line "audit asserted in tests for … setup handler commit" moves to Phase 6.
2. **GL audit rows are written inside the posting transaction (7.2), unlike HTTP audit (7.1.3).** Rule 7.1.3 ("audit failure must not fail business transaction") is kept for the interceptor. For GL events, `domain.md` §4 (ACID) takes priority: a journal entry must never commit without its audit row. In practice, the only way an insert into `audit_logs` fails is a database failure that would abort the posting anyway.
3. **Fiscal period close/lock audit is best-effort, not atomic.** Period status changes go through the generic `CrudService.update`, which runs no transaction and has no transaction hook. The row is written from `onUpdated`. An atomic `closePeriod` command is out of scope.
4. **Append-only is enforced for UPDATE at the database and for DELETE at the application.** A trigger rejects every `UPDATE` on `audit_logs`. `DELETE` is not blocked in the database, because `Tenant` deletion cascades into `audit_logs` and a future retention purge (Q4) will need it. No application code path deletes rows, and a test pins that.
5. **"Phase 3 acceptance scenario passes reconciliation gate" is a manual gate (Task 15).** No automated fixture tenant exists; all API tests are Prisma-stub unit tests. Task 15 runs the checks against a seeded dev database and commits the result as the new baseline.

## Global Constraints

- **HARD-GATE:** Task 0 decisions must be approved before Task 1 starts.
- **New dependency:** `@nestjs/schedule` only. No other new packages (e.g. no `nestjs-cls`; use `node:async_hooks`).
- **Money precision:** `Decimal(18,4)` → tolerance `0.0001`. Exchange rates `Decimal(18,6)`.
- **Swagger:** every response DTO field carries `@ApiProperty` with an explicit `type:` (or `enum` + `enumName`, or `type: () => X`). Response DTOs use initializers, not `!` (`.ai/rules/api.md`).
- **After any DTO/controller change:** `pnpm generate` then `pnpm --filter @devloggers/api-contracts build`. Never hand-edit `packages/api-contracts/types/index.ts`.
- **No `as any` / `as unknown as X` / `@ts-ignore` in production code.** Test stubs follow the existing spec convention (`as never`).
- **Prisma:** never call `prisma` from a new service; use a repository. (`BalanceDriftService` is an existing exception, extended in place, not refactored.)
- **Migrations:** `prisma migrate dev --create-only`, then hand-edit the SQL. Per project memory, the shared dev DB can hold an advisory lock. If `db:migrate:dev` blocks, commit the migration file, note the deferral in the PR, and carry on with the Prisma-stub tests (they do not need the DB).
- **tsconfig:** `strict`, `noUncheckedIndexedAccess`, `isolatedModules` (use `export type` for type-only re-exports).
- **Verification per task:** `pnpm --filter @devloggers/api test -- <path>` plus `pnpm --filter @devloggers/api typecheck`. The full suite runs in Task 15.
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File map

| File | Responsibility | Task |
|------|----------------|------|
| `apps/api/src/common/request-context/request-context.ts` | ALS store: correlationId, source, actor, ip, metadata | 1 |
| `apps/api/src/common/request-context/correlation-id.middleware.ts` | Assigns / echoes `x-correlation-id`, opens context | 1 |
| `apps/api/src/common/logging/app-logger.ts` | `ConsoleLogger` subclass adding `correlationId` to JSON lines | 2 |
| `packages/db-prisma/src/schema/audit.prisma` + migration | `source`, `correlationId`, `metadata`, UPDATE-blocking trigger | 3 |
| `apps/api/src/modules/audit/redact.ts` | Secret redaction + size cap | 4 |
| `apps/api/src/modules/audit/audit-writer.service.ts` | `record` (best-effort) / `recordInTx` (atomic) | 4 |
| `apps/api/src/modules/audit/audit.interceptor.ts` | Global HTTP mutation audit | 5 |
| `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts` | JOURNAL_POST / JOURNAL_REVERSE audit | 6 |
| `apps/api/src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service.ts` | Session post/lock audit | 7 |
| `apps/api/src/modules/accounting/fiscal-periods/services/fiscal-periods.service.ts` | Period status audit | 7 |
| `apps/api/src/modules/accounting/posting/policies/{opening-stock,stock-count-adjusted}.policy.ts` | Populate `amount`/`exchangeRate` | 8 |
| `apps/api/src/modules/accounting/reconciliation/services/balance-drift.service.ts` | Checks 2/3 rebuilt; checks 6/8 added | 9, 10 |
| `apps/api/src/modules/accounting/reconciliation/reconciliation-checks.ts` | Pure: map report → 8 checks, fingerprints, new-drift diff | 11 |
| `apps/api/src/modules/accounting/reconciliation/services/business-setup-reconciliation.service.ts` | `evaluate(tenantId)` | 11 |
| `packages/db-prisma/src/schema/reconciliation.prisma` + migration | `ReconciliationRun` | 12 |
| `apps/api/src/modules/accounting/reconciliation/repositories/reconciliation-runs.repository.ts` | Run persistence + tenant ids | 12 |
| `apps/api/src/modules/accounting/reconciliation/services/reconciliation-monitor.service.ts` | Run + baseline diff + alert | 12 |
| `apps/api/src/modules/accounting/reconciliation/services/reconciliation.scheduler.ts` | Daily cron | 13 |
| `apps/api/src/modules/accounting/reconciliation/controllers/reconciliation.controller.ts` | `GET checks`, `GET runs`, `POST runs` | 14 |

---

## Task 0 — Decision gate (no code)

Present these to the user and record the answers in `docs/superpowers/specs/2026-08-20-erp-roadmap/00-open-issues.md` (Q4) and at the top of this plan. **Do not start Task 1 until all four are answered.**

- [ ] **Q4 — AuditLog retention.** Recommendation: *retain indefinitely in Phase 7; no purge job.* A later purge must never delete rows with `source = 'GL'`, and must run as an explicit `DELETE` (the trigger in Task 3 only blocks `UPDATE`, so a purge stays possible). Nothing in this plan depends on a shorter retention.
- [ ] **New dependency `@nestjs/schedule`.** Recommendation: approve. The alternative, `setInterval` in `onApplicationBootstrap`, has no cron semantics and no clean shutdown.
- [ ] **Deviation 2 (atomic GL audit).** Recommendation: approve.
- [ ] **Check 2 derivation change (Task 9).** `Cashbox.balance` will be checked against the journal-line subledger instead of payment/expense documents. Existing drift baselines (`docs/drift-baseline.json`) were recorded under the old derivation, so Task 15 records a new baseline. Recommendation: approve (this is what ADR-1 and 00-accounting-principles check #2 require).

---

## Task 1 — Request context + correlation id middleware (7.3.2 foundation)

**Files:**
- Create: `apps/api/src/common/request-context/request-context.ts`
- Create: `apps/api/src/common/request-context/correlation-id.middleware.ts`
- Create: `apps/api/src/common/request-context/request-context.spec.ts`
- Modify: `apps/api/src/common/constants/headers.ts`
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Produces:
  - `type AuditSource = 'HTTP' | 'GL' | 'SCHEDULER' | 'BUSINESS_SETUP' | 'SYSTEM'`
  - `interface RequestContextStore { correlationId: string; source: AuditSource; userId?: string; tenantId?: string; ipAddress?: string; metadata: Record<string, unknown> }`
  - `RequestContext.run<T>(patch: Partial<RequestContextStore>, fn: () => T): T` — inherits unspecified fields from the parent context and merges `metadata`
  - `RequestContext.get(): RequestContextStore | undefined`
  - `RequestContext.correlationId(): string | undefined`
  - `RequestContext.setActor(userId: string, tenantId: string): void` — mutates the current store; no-op outside a context
  - `correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void`
  - `CORRELATION_ID = 'x-correlation-id'`

- [ ] **Step 1: Write the failing test**

`apps/api/src/common/request-context/request-context.spec.ts`:

```ts
import { RequestContext } from './request-context';
import { correlationIdMiddleware } from './correlation-id.middleware';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('RequestContext', () => {
    it('is undefined outside a context', () => {
        expect(RequestContext.get()).toBeUndefined();
        expect(RequestContext.correlationId()).toBeUndefined();
    });

    it('generates a correlation id and defaults source to SYSTEM', () => {
        RequestContext.run({}, () => {
            expect(RequestContext.correlationId()).toMatch(UUID);
            expect(RequestContext.get()?.source).toBe('SYSTEM');
        });
    });

    it('nested runs inherit the parent and merge metadata', () => {
        RequestContext.run({ correlationId: 'corr-1', source: 'HTTP', userId: 'u1', metadata: { a: 1 } }, () => {
            RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType: 'OPENING_CASH' } }, () => {
                expect(RequestContext.get()).toEqual({
                    correlationId: 'corr-1',
                    source: 'BUSINESS_SETUP',
                    userId: 'u1',
                    tenantId: undefined,
                    ipAddress: undefined,
                    metadata: { a: 1, taskType: 'OPENING_CASH' },
                });
            });
            expect(RequestContext.get()?.source).toBe('HTTP');
        });
    });

    it('survives async boundaries', async () => {
        await RequestContext.run({ correlationId: 'corr-async' }, async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            expect(RequestContext.correlationId()).toBe('corr-async');
        });
    });

    it('setActor fills the current store and is a no-op outside a context', () => {
        expect(() => RequestContext.setActor('u1', 't1')).not.toThrow();
        RequestContext.run({}, () => {
            RequestContext.setActor('u2', 't2');
            expect(RequestContext.get()).toMatchObject({ userId: 'u2', tenantId: 't2' });
        });
    });
});

describe('correlationIdMiddleware', () => {
    function invoke(incoming: string | undefined) {
        const res = { setHeader: jest.fn() };
        const req = { header: jest.fn().mockReturnValue(incoming), ip: '10.0.0.1' };
        let seen: ReturnType<typeof RequestContext.get>;
        correlationIdMiddleware(req as never, res as never, () => {
            seen = RequestContext.get();
        });
        return { res, seen: seen! };
    }

    it('generates an id, echoes it, and opens an HTTP context', () => {
        const { res, seen } = invoke(undefined);
        expect(seen.correlationId).toMatch(UUID);
        expect(seen.source).toBe('HTTP');
        expect(seen.ipAddress).toBe('10.0.0.1');
        expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', seen.correlationId);
    });

    it('honours a well-formed incoming id', () => {
        expect(invoke('abc-123_DEF.4').seen.correlationId).toBe('abc-123_DEF.4');
    });

    it('replaces a malformed incoming id (header injection / oversize)', () => {
        expect(invoke('bad id\r\nX-Evil: 1').seen.correlationId).toMatch(UUID);
        expect(invoke('a'.repeat(129)).seen.correlationId).toMatch(UUID);
    });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- src/common/request-context`
Expected: FAIL — `Cannot find module './request-context'`.

- [ ] **Step 3: Implement**

`apps/api/src/common/request-context/request-context.ts`:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/** Where a unit of work originated. Persisted on AuditLog.source. */
export type AuditSource = 'HTTP' | 'GL' | 'SCHEDULER' | 'BUSINESS_SETUP' | 'SYSTEM';

export interface RequestContextStore {
    correlationId: string;
    source: AuditSource;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    metadata: Record<string, unknown>;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Phase 7.3.2 — carries the correlation id (and actor/source) from the HTTP
 * request, scheduler tick or setup task through services, transactions, logs
 * and audit rows without threading parameters through every call.
 */
export const RequestContext = {
    run<T>(patch: Partial<RequestContextStore>, fn: () => T): T {
        const parent = storage.getStore();
        const store: RequestContextStore = {
            correlationId: patch.correlationId ?? parent?.correlationId ?? randomUUID(),
            source: patch.source ?? parent?.source ?? 'SYSTEM',
            userId: patch.userId ?? parent?.userId,
            tenantId: patch.tenantId ?? parent?.tenantId,
            ipAddress: patch.ipAddress ?? parent?.ipAddress,
            metadata: { ...parent?.metadata, ...patch.metadata },
        };
        return storage.run(store, fn);
    },

    get(): RequestContextStore | undefined {
        return storage.getStore();
    },

    correlationId(): string | undefined {
        return storage.getStore()?.correlationId;
    },

    /** Called once the JWT guard has resolved the user (see AuditInterceptor). */
    setActor(userId: string, tenantId: string): void {
        const store = storage.getStore();
        if (!store) return;
        store.userId = userId;
        store.tenantId = tenantId;
    },
};
```

`apps/api/src/common/constants/headers.ts` — append:

```ts
export const CORRELATION_ID = 'x-correlation-id'
```

`apps/api/src/common/request-context/correlation-id.middleware.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID } from '../constants/headers';
import { RequestContext } from './request-context';

/** Accept caller-supplied ids only if they are short and header-safe. */
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Plain Express middleware (registered with app.use in main.ts, so it wraps
 * every route with no Nest route-pattern matching). Everything downstream of
 * next() — guards, interceptors, services, Prisma calls — runs inside the context.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(CORRELATION_ID);
    const correlationId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(CORRELATION_ID, correlationId);
    RequestContext.run({ correlationId, source: 'HTTP', ipAddress: req.ip }, () => next());
}
```

`apps/api/src/main.ts` — add the import next to the others, and register the middleware **before** `cookieParser` so it wraps everything:

```ts
import { correlationIdMiddleware } from './common/request-context/correlation-id.middleware';
```

```ts
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.use(correlationIdMiddleware);
  app.use(cookieParser.default());
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/common/request-context && pnpm --filter @devloggers/api typecheck`
Expected: 8 tests pass; typecheck exits 0.

- [ ] **Step 5: Smoke check (only if the API can start locally)**

Run the API (`pnpm --filter @devloggers/api dev`), then: `curl -si http://localhost:4040/docs | grep -i x-correlation-id`
Expected: one `x-correlation-id: <uuid>` header.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/request-context apps/api/src/common/constants/headers.ts apps/api/src/main.ts
git commit -m "feat(api): request context with correlation id (Phase 7.3.2)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2 — JSON structured logger in production (7.3.1)

**Files:**
- Create: `apps/api/src/common/logging/app-logger.ts`
- Create: `apps/api/src/common/logging/app-logger.spec.ts`
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `RequestContext.correlationId()` (Task 1)
- Produces: `class AppLogger extends ConsoleLogger` — in JSON mode every line gains `correlationId` when inside a context

Verified in `node_modules/@nestjs/common/services/console-logger.service.d.ts` (Nest 11.1.17): `ConsoleLoggerOptions.json?: boolean` and `protected getJsonLogObject(message, options: { context: string; logLevel: LogLevel; writeStreamType?; errorStack? })` both exist.

- [ ] **Step 1: Write the failing test**

`apps/api/src/common/logging/app-logger.spec.ts`:

```ts
import { AppLogger } from './app-logger';
import { RequestContext } from '../request-context/request-context';

function captureStdout(fn: () => void): Array<Record<string, unknown>> {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
        fn();
        return write.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>);
    } finally {
        write.mockRestore();
    }
}

describe('AppLogger (json mode)', () => {
    it('adds correlationId inside a request context', () => {
        const logger = new AppLogger({ json: true });
        const [line] = captureStdout(() =>
            RequestContext.run({ correlationId: 'corr-1' }, () => logger.log('posted', 'PaymentsService')),
        );
        expect(line).toMatchObject({ level: 'log', message: 'posted', context: 'PaymentsService', correlationId: 'corr-1' });
    });

    it('omits correlationId outside a context', () => {
        const logger = new AppLogger({ json: true });
        const [line] = captureStdout(() => logger.log('boot', 'Bootstrap'));
        expect(line).not.toHaveProperty('correlationId');
    });

    it('keeps structured object messages as objects', () => {
        const logger = new AppLogger({ json: true });
        const [line] = captureStdout(() =>
            RequestContext.run({ correlationId: 'corr-2' }, () => logger.log({ msg: 'run', tenantId: 't1' }, 'Recon')),
        );
        expect(line).toMatchObject({ message: { msg: 'run', tenantId: 't1' }, correlationId: 'corr-2' });
    });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- src/common/logging`
Expected: FAIL — `Cannot find module './app-logger'`.

- [ ] **Step 3: Implement**

`apps/api/src/common/logging/app-logger.ts`:

```ts
import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { RequestContext } from '../request-context/request-context';

/**
 * Phase 7.3.1 — Nest's built-in JSON logger plus the request correlation id,
 * so a log line can be joined to its AuditLog rows (AuditLog.correlationId).
 */
export class AppLogger extends ConsoleLogger {
    protected override getJsonLogObject(
        message: unknown,
        options: { context: string; logLevel: LogLevel; writeStreamType?: 'stdout' | 'stderr'; errorStack?: unknown },
    ) {
        const base = super.getJsonLogObject(message, options);
        const correlationId = RequestContext.correlationId();
        return correlationId ? { ...base, correlationId } : base;
    }
}
```

`apps/api/src/main.ts` — import and use it on `create`:

```ts
import { AppLogger } from './common/logging/app-logger';
```

```ts
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? new AppLogger({ json: true }) : undefined,
  });
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/common/logging && pnpm --filter @devloggers/api typecheck`
Expected: 3 pass; typecheck exits 0. If the first test fails because nothing was written to stdout, check `printAsJson` in `node_modules/@nestjs/common/services/console-logger.service.js` for the stream it writes to, and spy on that one.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/logging apps/api/src/main.ts
git commit -m "feat(api): JSON logger with correlation id in production (Phase 7.3.1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3 — AuditLog schema: source, correlation id, metadata, append-only trigger

**Files:**
- Modify: `packages/db-prisma/src/schema/audit.prisma`
- Create: `packages/db-prisma/src/schema/migrations/<timestamp>_audit_log_observability/migration.sql` (generated, then hand-edited)

**Interfaces:**
- Produces: `AuditLog.source: string` (default `'HTTP'`), `AuditLog.correlationId: string | null`, `AuditLog.metadata: Json | null`; the DB rejects `UPDATE audit_logs`

- [ ] **Step 1: Edit the model**

Replace the model body in `packages/db-prisma/src/schema/audit.prisma` with the following. The comment block above the model stays as it is.

```prisma
model AuditLog {
    id            String   @id @default(uuid())
    tenantId      String   @map("tenant_id")
    userId        String   @map("user_id") // "system" for scheduler / non-user work
    action        String   // e.g. CREATE, UPDATE, DELETE, JOURNAL_POST, OPENING_SESSION_LOCK
    entityType    String   @map("entity_type") // e.g. "payments", "journal_entry"
    entityId      String   @map("entity_id")
    oldValues     Json?    @map("old_values")
    newValues     Json?    @map("new_values")
    ipAddress     String?  @map("ip_address")
    /// HTTP | GL | SCHEDULER | BUSINESS_SETUP | SYSTEM — see RequestContext.AuditSource
    source        String   @default("HTTP")
    /// Joins this row to its request's log lines and sibling audit rows.
    correlationId String?  @map("correlation_id")
    /// Free-form context, e.g. { method, route, handler } or { taskType }.
    metadata      Json?
    /// Append-only: a DB trigger rejects UPDATE (migration audit_log_observability).
    createdAt     DateTime @default(now()) @map("created_at")

    tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    @@index([tenantId])
    @@index([tenantId, entityType, entityId])
    @@index([tenantId, createdAt])
    @@index([correlationId])
    @@map("audit_logs")
}
```

- [ ] **Step 2: Generate the migration without applying it**

Run: `pnpm --filter @devloggers/db-prisma exec prisma migrate dev --schema=src/schema --create-only --name audit_log_observability`
Expected: a new folder `src/schema/migrations/<timestamp>_audit_log_observability/` whose `migration.sql` adds three columns and two indexes.

- [ ] **Step 3: Append the trigger to that `migration.sql`**

```sql
-- Phase 7.2.3 — audit rows are append-only. UPDATE is rejected unconditionally.
-- DELETE is intentionally NOT blocked: Tenant deletion cascades here, and a future
-- retention purge (roadmap Q4) must remain possible. No application path deletes rows.
CREATE OR REPLACE FUNCTION audit_logs_reject_update() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: UPDATE is not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_reject_update();
```

- [ ] **Step 4: Apply and regenerate the client**

Run: `pnpm --filter @devloggers/db-prisma db:migrate:dev && pnpm --filter @devloggers/db-prisma db:generate && pnpm --filter @devloggers/db-prisma typecheck`
Expected: migration applied; client generated; typecheck exits 0.
If `db:migrate:dev` blocks on the shared-DB advisory lock: run only `db:generate` + `typecheck`, and write "migration audit_log_observability not applied — shared DB lock" in the PR description.

- [ ] **Step 5: Verify the trigger (only if applied)**

Run in `psql` against the dev DB:
```sql
UPDATE audit_logs SET action = action WHERE false;  -- 0 rows: trigger not fired, no error
INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id)
  SELECT gen_random_uuid(), id, 'system', 'TRIGGER_PROBE', 'probe', 'probe' FROM tenants LIMIT 1;
UPDATE audit_logs SET action = 'X' WHERE action = 'TRIGGER_PROBE';
```
Expected: the final statement fails with `audit_logs is append-only: UPDATE is not permitted`. Remove the probe row with `DELETE FROM audit_logs WHERE action = 'TRIGGER_PROBE';` (DELETE is allowed by design).

- [ ] **Step 6: Commit**

```bash
git add packages/db-prisma/src/schema/audit.prisma packages/db-prisma/src/schema/migrations
git commit -m "feat(db): audit log source/correlation/metadata + append-only trigger (Phase 7.1/7.2.3)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4 — AuditWriter + redaction; AuditService becomes read-only (7.1.2, 7.1.3, 7.2.3)

**Files:**
- Create: `apps/api/src/modules/audit/redact.ts`
- Create: `apps/api/src/modules/audit/redact.spec.ts`
- Create: `apps/api/src/modules/audit/audit-writer.service.ts`
- Create: `apps/api/src/modules/audit/audit-writer.service.spec.ts`
- Modify: `apps/api/src/modules/audit/audit.service.ts` (delete the unused `log()` method)
- Modify: `apps/api/src/modules/audit/audit.module.ts` (`@Global`, provide/export `AuditWriter`)

**Interfaces:**
- Consumes: `RequestContext`, `AuditSource` (Task 1); the new `AuditLog` columns (Task 3)
- Produces:
  - `const SYSTEM_USER_ID = 'system'`
  - `interface AuditEntry { tenantId: string; userId: string; action: string; entityType: string; entityId: string; oldValues?: unknown; newValues?: unknown; source?: AuditSource; metadata?: Record<string, unknown> }`
  - `interface AuditTx { auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): Promise<unknown> } }` — any Prisma transaction client satisfies this
  - `AuditWriter.record(entry: AuditEntry): Promise<void>` — **never throws**
  - `AuditWriter.recordInTx(tx: AuditTx, entry: AuditEntry): Promise<void>` — throws with the transaction
  - `redact(value: unknown): unknown`, `REDACTED = '[REDACTED]'`

- [ ] **Step 0: Confirm `AuditService.log` is unused**

Run: `grep -rn "auditService.log" apps/api/src --include=*.ts`
Expected: no matches (as of 2026-09-17). If there is a caller, switch it to `AuditWriter.record` in this task.

- [ ] **Step 1: Write the failing redaction tests**

`apps/api/src/modules/audit/redact.spec.ts`:

```ts
import { redact, REDACTED } from './redact';

describe('redact', () => {
    it('redacts sensitive keys at any depth, case- and separator-insensitive', () => {
        expect(
            redact({
                email: 'a@b.c',
                password: 'p',
                passwordHash: 'h',
                user: { accessToken: 't', refresh_token: 'r', profile: { apiKey: 'k', otp: '1234' } },
                headers: { Authorization: 'Bearer x', cookie: 'c' },
                clientSecret: 's',
            }),
        ).toEqual({
            email: 'a@b.c',
            password: REDACTED,
            passwordHash: REDACTED,
            user: { accessToken: REDACTED, refresh_token: REDACTED, profile: { apiKey: REDACTED, otp: REDACTED } },
            headers: { Authorization: REDACTED, cookie: REDACTED },
            clientSecret: REDACTED,
        });
    });

    it('does not over-redact keys that merely contain a sensitive substring', () => {
        expect(redact({ notPosted: true, tokenCount: 3, passportNumber: 'X1' })).toEqual({
            notPosted: true,
            tokenCount: 3,
            passportNumber: 'X1',
        });
    });

    it('walks arrays, serializes dates and Decimal-like values, hides binaries', () => {
        const decimalLike = { toJSON: () => '12.5000' };
        expect(
            redact({
                lines: [{ token: 'x', amount: decimalLike }],
                at: new Date('2026-01-01T00:00:00.000Z'),
                file: Buffer.from('abc'),
            }),
        ).toEqual({ lines: [{ token: REDACTED, amount: '12.5000' }], at: '2026-01-01T00:00:00.000Z', file: '[BINARY]' });
    });

    it('treats class instances (validated DTOs) like plain objects', () => {
        class CreateUserDto {
            email = 'a@b.c';
            password = 'secret';
        }
        expect(redact(new CreateUserDto())).toEqual({ email: 'a@b.c', password: REDACTED });
    });

    it('caps oversized payloads', () => {
        expect(redact({ blob: 'x'.repeat(40_000) })).toEqual({ truncated: true, originalSize: expect.any(Number) });
    });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- src/modules/audit/redact`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/api/src/modules/audit/redact.ts`**

```ts
export const REDACTED = '[REDACTED]';

/** Matched against the END of the normalized key (lower-case, no `-`/`_`). */
const SENSITIVE_SUFFIXES = [
    'password',
    'passwordhash',
    'token',
    'tokens',
    'secret',
    'apikey',
    'otp',
    'otpcode',
    'authorization',
    'cookie',
];
const MAX_DEPTH = 8;
const MAX_JSON_CHARS = 32_000;

function isSensitive(key: string): boolean {
    const normalized = key.toLowerCase().replace(/[-_]/g, '');
    return SENSITIVE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function walk(value: unknown, depth: number): unknown {
    if (value === null || value === undefined) return value;
    if (depth > MAX_DEPTH) return '[TRUNCATED]';
    if (Buffer.isBuffer(value)) return '[BINARY]';
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));
    if (typeof value === 'object') {
        const withToJson = value as { toJSON?: () => unknown };
        // Prisma Decimal and similar value objects serialize themselves.
        if (typeof withToJson.toJSON === 'function') return withToJson.toJSON();
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            out[key] = isSensitive(key) ? REDACTED : walk(child, depth + 1);
        }
        return out;
    }
    return value;
}

/** Phase 7.1.2 — strip secrets and bound the size of anything written to AuditLog JSON columns. */
export function redact(value: unknown): unknown {
    const cleaned = walk(value, 0);
    const json = JSON.stringify(cleaned);
    if (json !== undefined && json.length > MAX_JSON_CHARS) {
        return { truncated: true, originalSize: json.length };
    }
    return cleaned;
}
```

Note: `Buffer.isBuffer` must be checked before the `toJSON` branch, because `Buffer` has its own `toJSON`.

- [ ] **Step 4: Run the redaction tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/audit/redact`
Expected: 5 pass.

- [ ] **Step 5: Write the failing writer tests**

`apps/api/src/modules/audit/audit-writer.service.spec.ts`:

```ts
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { AuditWriter } from './audit-writer.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { RequestContext } from '../../common/request-context/request-context';
import { REDACTED } from './redact';

function build(create: jest.Mock = jest.fn().mockResolvedValue({})) {
    const prisma = { auditLog: { create } };
    return { writer: new AuditWriter(prisma as never), create };
}

const entry = {
    tenantId: 't1',
    userId: 'u1',
    action: 'CREATE',
    entityType: 'payments',
    entityId: 'p1',
    newValues: { amount: 5, password: 'x' },
};

describe('AuditWriter.record', () => {
    it('writes context fields, merged metadata and redacted values', async () => {
        const { writer, create } = build();
        await RequestContext.run(
            { correlationId: 'corr-1', source: 'BUSINESS_SETUP', ipAddress: '10.0.0.1', metadata: { taskType: 'OPENING_CASH' } },
            () => writer.record({ ...entry, metadata: { handler: 'X.create' } }),
        );
        expect(create).toHaveBeenCalledWith({
            data: {
                tenantId: 't1',
                userId: 'u1',
                action: 'CREATE',
                entityType: 'payments',
                entityId: 'p1',
                oldValues: undefined,
                newValues: { amount: 5, password: REDACTED },
                ipAddress: '10.0.0.1',
                source: 'BUSINESS_SETUP',
                correlationId: 'corr-1',
                metadata: { taskType: 'OPENING_CASH', handler: 'X.create' },
            },
        });
    });

    it('defaults to SYSTEM with no correlation id outside a context', async () => {
        const { writer, create } = build();
        await writer.record(entry);
        expect(create.mock.calls[0]?.[0]).toMatchObject({
            data: { source: 'SYSTEM', correlationId: null, ipAddress: null, metadata: undefined },
        });
    });

    it('records the context source when the entry overrides it', async () => {
        const { writer, create } = build();
        await RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType: 'OPENING_CASH' } }, () =>
            writer.record({ ...entry, source: 'GL' }),
        );
        expect(create.mock.calls[0]?.[0]).toMatchObject({
            data: { source: 'GL', metadata: { taskType: 'OPENING_CASH', contextSource: 'BUSINESS_SETUP' } },
        });
    });

    it('never throws when the insert fails (7.1.3)', async () => {
        const { writer } = build(jest.fn().mockRejectedValue(new Error('db down')));
        await expect(writer.record(entry)).resolves.toBeUndefined();
    });
});

describe('AuditWriter.recordInTx', () => {
    it('writes through the transaction client, not the root client', async () => {
        const { writer, create } = build();
        const txCreate = jest.fn().mockResolvedValue({});
        await writer.recordInTx({ auditLog: { create: txCreate } }, entry);
        expect(txCreate).toHaveBeenCalledTimes(1);
        expect(create).not.toHaveBeenCalled();
    });

    it('propagates failure so the business transaction rolls back', async () => {
        const { writer } = build();
        const txCreate = jest.fn().mockRejectedValue(new Error('insert failed'));
        await expect(writer.recordInTx({ auditLog: { create: txCreate } }, entry)).rejects.toThrow('insert failed');
    });
});

describe('Audit trail is append-only (7.2.3)', () => {
    it('exposes no update/delete/purge method on the write or read services', () => {
        const methods = [
            ...Object.getOwnPropertyNames(AuditWriter.prototype),
            ...Object.getOwnPropertyNames(AuditService.prototype),
        ];
        expect(methods.filter((m) => /update|delete|remove|purge|upsert/i.test(m))).toEqual([]);
    });

    it('exposes only GET routes', () => {
        const handlers = Object.getOwnPropertyNames(AuditController.prototype).filter((m) => m !== 'constructor');
        expect(handlers.length).toBeGreaterThan(0);
        for (const name of handlers) {
            const handler: unknown = Reflect.get(AuditController.prototype, name);
            expect(Reflect.getMetadata(METHOD_METADATA, handler as object)).toBe(RequestMethod.GET);
        }
    });
});
```

- [ ] **Step 6: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- src/modules/audit/audit-writer`
Expected: FAIL — `Cannot find module './audit-writer.service'`.

- [ ] **Step 7: Implement the writer and wire the module**

`apps/api/src/modules/audit/audit-writer.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';
import { RequestContext, type AuditSource } from '../../common/request-context/request-context';
import { redact } from './redact';

export const SYSTEM_USER_ID = 'system';

export interface AuditEntry {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: unknown;
    newValues?: unknown;
    /** Defaults to the request context's source. */
    source?: AuditSource;
    metadata?: Record<string, unknown>;
}

/** Structural: any Prisma transaction client satisfies this. */
export interface AuditTx {
    auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): Promise<unknown> };
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    return redact(value) as Prisma.InputJsonValue;
}

/**
 * The only writer of AuditLog. Two modes, by design (plan deviation 2):
 * - record():     best-effort, never throws — HTTP interceptor, period status (7.1.3)
 * - recordInTx(): atomic with the caller's transaction — GL events (7.2.1/7.2.2)
 */
@Injectable()
export class AuditWriter {
    private readonly logger = new Logger(AuditWriter.name);

    constructor(private readonly prisma: PrismaService) {}

    async record(entry: AuditEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({ data: this.toData(entry) });
        } catch (err) {
            this.logger.error({
                msg: 'audit write failed',
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    async recordInTx(tx: AuditTx, entry: AuditEntry): Promise<void> {
        await tx.auditLog.create({ data: this.toData(entry) });
    }

    private toData(entry: AuditEntry): Prisma.AuditLogUncheckedCreateInput {
        const ctx = RequestContext.get();
        const metadata: Record<string, unknown> = {
            ...ctx?.metadata,
            ...(ctx && entry.source && entry.source !== ctx.source ? { contextSource: ctx.source } : {}),
            ...entry.metadata,
        };
        return {
            tenantId: entry.tenantId,
            userId: entry.userId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            oldValues: toJson(entry.oldValues),
            newValues: toJson(entry.newValues),
            ipAddress: ctx?.ipAddress ?? null,
            source: entry.source ?? ctx?.source ?? 'SYSTEM',
            correlationId: ctx?.correlationId ?? null,
            metadata: Object.keys(metadata).length > 0 ? toJson(metadata) : undefined,
        };
    }
}
```

`apps/api/src/modules/audit/audit.service.ts` — delete the whole `async log(...)` method. The class keeps only `findAll`.

`apps/api/src/modules/audit/audit.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditWriter } from './audit-writer.service';

/** Global: GL services across accounting modules inject AuditWriter without importing this module. */
@Global()
@Module({
    controllers: [AuditController],
    providers: [AuditService, AuditWriter],
    exports: [AuditService, AuditWriter],
})
export class AuditModule {}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/audit && pnpm --filter @devloggers/api typecheck`
Expected: 13 pass (5 redact + 8 writer/append-only); typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/audit
git commit -m "feat(api): AuditWriter with redaction, best-effort and transactional modes (Phase 7.1.2/7.1.3/7.2.3)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5 — Global AuditInterceptor for HTTP mutations (7.1.1)

**Files:**
- Create: `apps/api/src/modules/audit/audit.interceptor.ts`
- Create: `apps/api/src/modules/audit/audit.interceptor.spec.ts`
- Modify: `apps/api/src/modules/audit/audit.module.ts` (register as `APP_INTERCEPTOR`)

**Interfaces:**
- Consumes: `AuditWriter.record` (Task 4), `RequestContext.setActor` (Task 1)
- Produces: one `AuditLog` row with `source='HTTP'` per successful authenticated `POST|PUT|PATCH|DELETE`:
  - `entityType` = controller path (e.g. `payments`)
  - `action` = handler name in UPPER_SNAKE (`create` → `CREATE`, `bulkDelete` → `BULK_DELETE`, `post` → `POST`)
  - `entityId` = `:id` param, else `response.data.id`, else `'n/a'`
  - `newValues` = request body (redacted by the writer); `metadata = { method, route, handler }`

Behaviour notes:
- Interceptors run after guards, so `request.user` is already set. Unauthenticated routes (login, refresh) have no `user` and are skipped.
- Failed requests are not audited: `tap` only fires on success.
- The write is fire-and-forget, so it never delays or fails the response.
- A payment post over HTTP produces two rows sharing one `correlationId`: this `POST` row plus the `JOURNAL_POST` row from Task 6.

- [ ] **Step 1: Write the failing test**

`apps/api/src/modules/audit/audit.interceptor.spec.ts`:

```ts
import type { CallHandler } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { RequestContext } from '../../common/request-context/request-context';

class PaymentsController {}
Reflect.defineMetadata(PATH_METADATA, 'payments', PaymentsController);

function context(req: Record<string, unknown>, handlerName: string) {
    const handler = { [handlerName]: function () {} }[handlerName];
    return {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => handler,
        getClass: () => PaymentsController,
    } as never;
}

function build() {
    const writer = { record: jest.fn().mockResolvedValue(undefined) };
    return { interceptor: new AuditInterceptor(writer as never, new Reflector()), writer };
}

const user = { id: 'u1', tenantId: 't1', email: 'a@b.c' };
const ok = (body: unknown): CallHandler => ({ handle: () => of(body) });

describe('AuditInterceptor', () => {
    it('audits a successful create with the id from the response envelope', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'POST', user, params: {}, body: { amount: 10 }, route: { path: '/payments' }, originalUrl: '/payments' };
        await lastValueFrom(interceptor.intercept(context(req, 'create'), ok({ status: 'success', data: { id: 'pay-1' } })));
        expect(writer.record).toHaveBeenCalledWith({
            tenantId: 't1',
            userId: 'u1',
            action: 'CREATE',
            entityType: 'payments',
            entityId: 'pay-1',
            newValues: { amount: 10 },
            source: 'HTTP',
            metadata: { method: 'POST', route: '/payments', handler: 'PaymentsController.create' },
        });
    });

    it('uses the :id param and the handler name for workflow actions', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'POST', user, params: { id: 'pay-9' }, body: {}, route: { path: '/payments/:id/post' } };
        await lastValueFrom(interceptor.intercept(context(req, 'post'), ok({ data: { id: 'other' } })));
        expect(writer.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'POST', entityId: 'pay-9' }));
    });

    it('converts camelCase handler names to UPPER_SNAKE and falls back to n/a', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'DELETE', user, params: {}, body: { ids: ['a'] }, originalUrl: '/payments/bulk' };
        await lastValueFrom(interceptor.intercept(context(req, 'bulkDelete'), ok(undefined)));
        expect(writer.record).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'BULK_DELETE', entityId: 'n/a', metadata: expect.objectContaining({ route: '/payments/bulk' }) }),
        );
    });

    it('skips GET requests', async () => {
        const { interceptor, writer } = build();
        await lastValueFrom(interceptor.intercept(context({ method: 'GET', user, params: {} }, 'list'), ok([])));
        expect(writer.record).not.toHaveBeenCalled();
    });

    it('skips unauthenticated mutations (login)', async () => {
        const { interceptor, writer } = build();
        const req = { method: 'POST', params: {}, body: { password: 'x' } };
        await lastValueFrom(interceptor.intercept(context(req, 'login'), ok({})));
        expect(writer.record).not.toHaveBeenCalled();
    });

    it('does not audit a failed request', async () => {
        const { interceptor, writer } = build();
        const failing: CallHandler = { handle: () => throwError(() => new Error('boom')) };
        const req = { method: 'POST', user, params: {}, body: {} };
        await expect(lastValueFrom(interceptor.intercept(context(req, 'create'), failing))).rejects.toThrow('boom');
        expect(writer.record).not.toHaveBeenCalled();
    });

    it('publishes the actor into the request context, for GETs too', async () => {
        const { interceptor } = build();
        await RequestContext.run({ source: 'HTTP' }, async () => {
            await lastValueFrom(interceptor.intercept(context({ method: 'GET', user, params: {} }, 'list'), ok([])));
            expect(RequestContext.get()).toMatchObject({ userId: 'u1', tenantId: 't1' });
        });
    });

    it('ignores non-http contexts', async () => {
        const { interceptor, writer } = build();
        const rpc = { getType: () => 'rpc' } as never;
        await lastValueFrom(interceptor.intercept(rpc, ok('x')));
        expect(writer.record).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- src/modules/audit/audit.interceptor`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`apps/api/src/modules/audit/audit.interceptor.ts`:

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { RequestUser } from '@devloggers/backend-core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { RequestContext } from '../../common/request-context/request-context';
import { AuditWriter } from './audit-writer.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type AuditableRequest = Request & { user?: RequestUser };

function toAction(handlerName: string): string {
    return handlerName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

function toEntityType(path: string | string[] | undefined): string {
    const first = Array.isArray(path) ? path[0] : path;
    return (first ?? '').replace(/^\/+|\/+$/g, '') || 'unknown';
}

function idFromResponse(response: unknown): string | undefined {
    if (!response || typeof response !== 'object') return undefined;
    const data: unknown = 'data' in response ? (response as { data?: unknown }).data : response;
    if (data && typeof data === 'object' && 'id' in data) {
        const id: unknown = (data as { id?: unknown }).id;
        return typeof id === 'string' ? id : undefined;
    }
    return undefined;
}

/**
 * Phase 7.1.1 — one AuditLog row per successful authenticated mutation.
 * Best-effort (7.1.3): fire-and-forget through AuditWriter.record, which never
 * throws. GL-level events are audited separately and atomically (Tasks 6–7).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly writer: AuditWriter,
        private readonly reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') return next.handle();

        const req = context.switchToHttp().getRequest<AuditableRequest>();
        const user = req.user;
        if (user?.id && user.tenantId) RequestContext.setActor(user.id, user.tenantId);

        if (!MUTATING_METHODS.has(req.method) || !user?.id || !user.tenantId) return next.handle();

        const controller = context.getClass();
        const handler = context.getHandler();
        const entityType = toEntityType(this.reflector.get<string | string[] | undefined>(PATH_METADATA, controller));
        const routePath: unknown = (req.route as { path?: unknown } | undefined)?.path;

        return next.handle().pipe(
            tap((response) => {
                void this.writer.record({
                    tenantId: user.tenantId,
                    userId: user.id,
                    action: toAction(handler.name),
                    entityType,
                    entityId: req.params?.id ?? idFromResponse(response) ?? 'n/a',
                    newValues: req.body,
                    source: 'HTTP',
                    metadata: {
                        method: req.method,
                        route: typeof routePath === 'string' ? routePath : req.originalUrl,
                        handler: `${controller.name}.${handler.name}`,
                    },
                });
            }),
        );
    }
}
```

`apps/api/src/modules/audit/audit.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditWriter } from './audit-writer.service';
import { AuditInterceptor } from './audit.interceptor';

/** Global: GL services across accounting modules inject AuditWriter without importing this module. */
@Global()
@Module({
    controllers: [AuditController],
    providers: [AuditService, AuditWriter, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
    exports: [AuditService, AuditWriter],
})
export class AuditModule {}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/audit && pnpm --filter @devloggers/api typecheck`
Expected: 21 pass; typecheck exits 0.

- [ ] **Step 5: Confirm spec generation still bootstraps**

Run: `pnpm generate`
Expected: exits 0. The interceptor adds no routes or DTOs, so the generated types must not change because of this task. `openapi.yaml` and `types/index.ts` already have uncommitted changes on this branch, so compare against `git diff --stat` captured before the task.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/audit
git commit -m "feat(api): global audit interceptor for authenticated mutations (Phase 7.1.1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6 — GL audit in `AccountingPostingFacade` (7.2.1; "payment post audited")

**Files:**
- Modify: `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts`
- Create: `apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts`

**Interfaces:**
- Consumes: `AuditWriter.recordInTx` (Task 4). `AuditModule` is `@Global`, so `PostingModule` needs no import change.
- Produces, inside the posting transaction, for every journal entry that goes through the facade (invoices, payments, expenses, stock counts, opening stock, opening sessions):
  - `action: 'JOURNAL_POST'`, `entityType: 'journal_entry'`, `entityId: <je id>`, `source: 'GL'`, `newValues: { number, referenceType, referenceId, date, fiscalPeriodId, lineCount, totalDebit }`, `metadata: { intentKind }`
  - `action: 'JOURNAL_REVERSE'` with `newValues: { number, referenceType, referenceId, reversalOfId, date }`

- [ ] **Step 1: Confirm no existing spec constructs the facade**

Run: `grep -rn "new AccountingPostingFacade" apps/api/src`
Expected: no matches (verified 2026-09-17). If there are any, add the fourth constructor argument `{ recordInTx: jest.fn() } as never` to them in Step 3.

- [ ] **Step 2: Write the failing test**

`apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts`:

```ts
import { AccountingPostingFacade } from './accounting-posting.facade';
import type { PaymentCancelledIntent, PaymentRecordedIntent } from './contracts/posting-intent';

const tx = { marker: 'tx' } as never;

const paymentIntent: PaymentRecordedIntent = {
    kind: 'PAYMENT_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-01T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'pay-1',
    description: 'Payment PAY-0001',
    type: 'RECEIPT',
    partyId: 'party-1',
    amount: 100,
    cashboxId: 'cb1',
    currencyId: 'USD',
};

const cancelIntent: PaymentCancelledIntent = {
    kind: 'PAYMENT_CANCELLED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-02T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'pay-1',
    description: 'Reversal of payment PAY-0001',
    originalEntryId: 'je-1',
};

function build() {
    const lines = [
        { accountId: 'cash', debit: 100, credit: 0, description: null, sortOrder: 0 },
        { accountId: 'ar', debit: 0, credit: 100, description: null, sortOrder: 1 },
    ];
    const registry = {
        resolvePosting: jest.fn().mockReturnValue({ referenceType: 'PAYMENT', buildLines: jest.fn().mockResolvedValue(lines) }),
        resolveReversal: jest.fn().mockReturnValue({ referenceType: 'PAYMENT_CANCELLATION' }),
    };
    const journalPosting = {
        post: jest.fn().mockResolvedValue({ id: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ id: 'je-2' }),
    };
    const docSeq = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const facade = new AccountingPostingFacade(registry as never, journalPosting as never, docSeq as never, audit as never);
    return { facade, journalPosting, audit };
}

describe('AccountingPostingFacade — GL audit (7.2.1)', () => {
    it('audits a payment post inside the posting transaction', async () => {
        const { facade, audit } = build();
        await facade.record(tx, paymentIntent);
        expect(audit.recordInTx).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            userId: 'u1',
            action: 'JOURNAL_POST',
            entityType: 'journal_entry',
            entityId: 'je-1',
            source: 'GL',
            newValues: {
                number: 'JE-000001',
                referenceType: 'PAYMENT',
                referenceId: 'pay-1',
                date: paymentIntent.date,
                fiscalPeriodId: 'fp1',
                lineCount: 2,
                totalDebit: 100,
            },
            metadata: { intentKind: 'PAYMENT_RECORDED' },
        });
    });

    it('audits a reversal with a link to the original entry', async () => {
        const { facade, audit } = build();
        await facade.reverse(tx, cancelIntent);
        expect(audit.recordInTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({
                action: 'JOURNAL_REVERSE',
                entityId: 'je-2',
                newValues: expect.objectContaining({ reversalOfId: 'je-1', referenceType: 'PAYMENT_CANCELLATION' }),
            }),
        );
    });

    it('fails the posting when the audit insert fails (atomic by design)', async () => {
        const { facade, audit } = build();
        audit.recordInTx.mockRejectedValue(new Error('audit insert failed'));
        await expect(facade.record(tx, paymentIntent)).rejects.toThrow('audit insert failed');
    });

    it('writes no audit row when posting itself is rejected', async () => {
        const { facade, journalPosting, audit } = build();
        journalPosting.post.mockRejectedValue(new Error('not balanced'));
        await expect(facade.record(tx, paymentIntent)).rejects.toThrow('not balanced');
        expect(audit.recordInTx).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting/posting/accounting-posting.facade`
Expected: FAIL — `recordInTx` never called (the facade ignores the 4th constructor argument).

- [ ] **Step 4: Implement**

Replace `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts` with the following. The existing class doc comment is kept, and one paragraph is added.

```ts
import { Injectable } from '@nestjs/common';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { DocumentSequencesService } from '../document-sequences/services/document-sequences.service';
import { assertFiscalPeriodOpen } from '../accounts/utils/assert-period-open';
import { AuditWriter } from '../../audit/audit-writer.service';
import { PostingPolicyRegistry } from './posting-policy.registry';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import type { PrismaTransactionClient } from './contracts/prisma-tx';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * The single entry point non-accounting modules use to reach the GL.
 * Deliberate step order — see this plan's "Deviations from the phase spec"
 * section, point 2 — is: period check -> policy builds lines (may reject on
 * missing GL config) -> allocate JE number -> persist. That order means a
 * rejection never burns a document-sequence number, matching every one of
 * the ten pre-Phase-1 call sites.
 *
 * Phase 7.2.1 — every posted/reversed entry writes its AuditLog row through
 * the same transaction client, so an entry can never commit un-audited.
 */
@Injectable()
export class AccountingPostingFacade {
    constructor(
        private readonly registry: PostingPolicyRegistry,
        private readonly journalPosting: JournalPostingService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly audit: AuditWriter,
    ) {}

    async record(tx: PrismaTransactionClient, intent: PostingRecordIntent): Promise<{ journalEntryId: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType, buildLines } = this.registry.resolvePosting(intent);
        const lines = await buildLines(tx);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.post(tx, {
            tenantId: intent.tenantId,
            number,
            date: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            lines,
        });

        await this.audit.recordInTx(tx, {
            tenantId: intent.tenantId,
            userId: intent.userId,
            action: 'JOURNAL_POST',
            entityType: 'journal_entry',
            entityId: entry.id,
            source: 'GL',
            newValues: {
                number,
                referenceType,
                referenceId: intent.referenceId,
                date: intent.date,
                fiscalPeriodId: intent.fiscalPeriodId,
                lineCount: lines.length,
                totalDebit: round(lines.reduce((sum, line) => sum + Number(line.debit), 0)),
            },
            metadata: { intentKind: intent.kind },
        });

        return { journalEntryId: entry.id };
    }

    /** Reversal always mirrors the original entry — JournalPostingService.reverse does the mirroring. */
    async reverse(tx: PrismaTransactionClient, intent: PostingCancellationIntent): Promise<{ journalEntryId: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType } = this.registry.resolveReversal(intent);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.reverse(tx, {
            tenantId: intent.tenantId,
            number,
            originalEntryId: intent.originalEntryId,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            reversalDate: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
        });

        await this.audit.recordInTx(tx, {
            tenantId: intent.tenantId,
            userId: intent.userId,
            action: 'JOURNAL_REVERSE',
            entityType: 'journal_entry',
            entityId: entry.id,
            source: 'GL',
            newValues: {
                number,
                referenceType,
                referenceId: intent.referenceId,
                reversalOfId: intent.originalEntryId,
                date: intent.date,
            },
            metadata: { intentKind: intent.kind },
        });

        return { journalEntryId: entry.id };
    }
}
```

If ESLint's `no-restricted-imports` flags `../../audit/audit-writer.service` (it should not: the rule only restricts `**/accounting/*` paths), run `pnpm --filter @devloggers/api lint:ci` and report the rule output rather than disabling it.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting src/modules/invoicing && pnpm --filter @devloggers/api typecheck`
Expected: the 4 new facade tests pass; every existing accounting/invoicing spec still passes; typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/accounting/posting
git commit -m "feat(accounting): audit journal post/reverse atomically in posting facade (Phase 7.2.1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7 — Opening session post/lock + fiscal period status audit (7.2.1, 7.2.2)

**Files:**
- Modify: `apps/api/src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service.ts`
- Create: `apps/api/src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service.spec.ts`
- Modify: `apps/api/src/modules/accounting/fiscal-periods/services/fiscal-periods.service.ts`
- Create: `apps/api/src/modules/accounting/fiscal-periods/services/fiscal-periods.service.spec.ts`

**Interfaces:**
- Consumes: `AuditWriter.recordInTx` / `AuditWriter.record`, `SYSTEM_USER_ID` (Task 4); `RequestContext.get()` (Task 1)
- Produces:
  - `OPENING_SESSION_POST` (in tx, `oldValues {status:'REVIEWED'}`, `newValues {status:'POSTED', number, lineCount}`)
  - `OPENING_SESSION_LOCK` (in tx, `POSTED → LOCKED`)
  - `PERIOD_CLOSED` / `PERIOD_LOCKED` / `PERIOD_REOPENED` (best-effort, entityType `fiscal_period`)
  - Constructor changes: `OpeningBalanceSessionsService(..., openingBank, audit: AuditWriter)` and `FiscalPeriodsService(repo, presenter, emitter, audit: AuditWriter)`

- [ ] **Step 1: Write the failing session test**

`apps/api/src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service.spec.ts`:

```ts
import { OpeningBalanceSessionsService } from './opening-balance-sessions.service';

function build(status: string) {
    const tx = { openingBalanceSession: { update: jest.fn().mockResolvedValue({}) } };
    const prisma = {
        openingBalanceSession: {
            findFirst: jest.fn().mockResolvedValue({
                id: 's1',
                tenantId: 't1',
                number: 'OBS-0001',
                status,
                fiscalPeriodId: 'fp1',
                lines: [],
            }),
        },
        fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ startDate: new Date('2026-01-01'), status: 'OPEN' }) },
        $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
    };
    const postingFacade = { record: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const service = new OpeningBalanceSessionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
        postingFacade as never,
        { syncProjection: jest.fn() } as never,
        { syncProjection: jest.fn() } as never,
        audit as never,
    );
    jest.spyOn(service, 'findById').mockResolvedValue({} as never);
    return { service, tx, audit, postingFacade };
}

describe('OpeningBalanceSessionsService — audit (7.2.2)', () => {
    it('audits opening post in the same transaction as the journal entry', async () => {
        const { service, tx, audit, postingFacade } = build('REVIEWED');
        await service.post('t1', 's1', 'u1');
        expect(postingFacade.record).toHaveBeenCalledWith(tx, expect.objectContaining({ kind: 'OPENING_SESSION_POSTED' }));
        expect(audit.recordInTx).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            userId: 'u1',
            action: 'OPENING_SESSION_POST',
            entityType: 'opening_balance_session',
            entityId: 's1',
            source: 'GL',
            oldValues: { status: 'REVIEWED' },
            newValues: { status: 'POSTED', number: 'OBS-0001', lineCount: 0 },
        });
    });

    it('audits lock inside a transaction', async () => {
        const { service, tx, audit } = build('POSTED');
        await service.lock('t1', 's1', 'u1');
        expect(tx.openingBalanceSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ status: 'LOCKED', lockedBy: 'u1' }) }),
        );
        expect(audit.recordInTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({
                action: 'OPENING_SESSION_LOCK',
                entityId: 's1',
                oldValues: { status: 'POSTED' },
                newValues: { status: 'LOCKED' },
            }),
        );
    });

    it('writes no audit row when the transition is invalid', async () => {
        const { service, audit } = build('DRAFT');
        await expect(service.lock('t1', 's1', 'u1')).rejects.toThrow(/Expected POSTED/);
        expect(audit.recordInTx).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Write the failing fiscal period test**

`apps/api/src/modules/accounting/fiscal-periods/services/fiscal-periods.service.spec.ts`:

```ts
import type { FiscalPeriod } from '@devloggers/db-prisma';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { RequestContext } from '../../../../common/request-context/request-context';

function build() {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new FiscalPeriodsService({} as never, {} as never, { emit: jest.fn() } as never, audit as never);
    return { service, audit };
}

const period = (status: string) => ({ id: 'fp1', tenantId: 't1', status }) as unknown as FiscalPeriod;

describe('FiscalPeriodsService — status audit (7.2.1)', () => {
    it('audits a close with the request actor', async () => {
        const { service, audit } = build();
        await RequestContext.run({ userId: 'u1' }, () => service['onUpdated']('t1', period('CLOSED'), period('OPEN')));
        expect(audit.record).toHaveBeenCalledWith({
            tenantId: 't1',
            userId: 'u1',
            action: 'PERIOD_CLOSED',
            entityType: 'fiscal_period',
            entityId: 'fp1',
            source: 'GL',
            oldValues: { status: 'OPEN' },
            newValues: { status: 'CLOSED' },
        });
    });

    it('names a reopen explicitly and falls back to the system actor', async () => {
        const { service, audit } = build();
        await service['onUpdated']('t1', period('OPEN'), period('CLOSED'));
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PERIOD_REOPENED', userId: 'system' }));
    });

    it('does nothing when status did not change', async () => {
        const { service, audit } = build();
        await service['onUpdated']('t1', period('OPEN'), period('OPEN'));
        expect(audit.record).not.toHaveBeenCalled();
    });
});
```

(`as unknown as FiscalPeriod` builds a partial test fixture; it does not touch API data, so the code-quality rule does not apply.)

- [ ] **Step 3: Run both tests and confirm they fail**

Run: `pnpm --filter @devloggers/api test -- opening-balance-sessions.service fiscal-periods.service`
Expected: FAIL — audit mocks never called.

- [ ] **Step 4: Implement the session changes**

In `opening-balance-sessions.service.ts`:

Add the import:

```ts
import { AuditWriter } from '../../../audit/audit-writer.service';
```

Append the constructor parameter (last position):

```ts
        private readonly openingBank: OpeningBankService,
        private readonly audit: AuditWriter,
    ) {}
```

In `post()`, extend the transaction body. The new code goes after the `openingBalanceSession.update`:

```ts
            await tx.openingBalanceSession.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
            });
            await this.audit.recordInTx(tx, {
                tenantId,
                userId,
                action: 'OPENING_SESSION_POST',
                entityType: 'opening_balance_session',
                entityId: id,
                source: 'GL',
                oldValues: { status: 'REVIEWED' },
                newValues: { status: 'POSTED', number: session.number, lineCount: session.lines.length },
            });
```

Replace the body of `lock()`:

```ts
    async lock(tenantId: string, id: string, userId: string): Promise<OpeningBalanceSessionResponseDto> {
        await this.getForTransition(tenantId, id, 'POSTED', 'lock');
        await this.prisma.$transaction(async (tx) => {
            await tx.openingBalanceSession.update({
                where: { id },
                data: { status: 'LOCKED', lockedAt: new Date(), lockedBy: userId },
            });
            await this.audit.recordInTx(tx, {
                tenantId,
                userId,
                action: 'OPENING_SESSION_LOCK',
                entityType: 'opening_balance_session',
                entityId: id,
                source: 'GL',
                oldValues: { status: 'POSTED' },
                newValues: { status: 'LOCKED' },
            });
        });
        return this.findById(tenantId, id);
    }
```

- [ ] **Step 5: Implement the fiscal period hook**

In `fiscal-periods.service.ts`, add imports:

```ts
import { AuditWriter, SYSTEM_USER_ID } from '../../../audit/audit-writer.service';
import { RequestContext } from '../../../../common/request-context/request-context';
```

Constructor:

```ts
    constructor(
        private readonly fiscalPeriodsRepository: FiscalPeriodsRepository,
        private readonly fiscalPeriodPresenter: FiscalPeriodPresenter,
        private readonly emitter: EventEmitter2,
        private readonly audit: AuditWriter,
    ) {
        super(fiscalPeriodsRepository, fiscalPeriodPresenter, emitter);
    }
```

New hook, added after `beforeUpdate`:

```ts
    /**
     * Phase 7.2.1 — period status transitions are always audited. Best-effort
     * (plan deviation 3): CrudService.update runs no transaction to join.
     */
    protected override async onUpdated(tenantId: string, entity: FiscalPeriod, previous: FiscalPeriod): Promise<void> {
        if (entity.status === previous.status) return;
        await this.audit.record({
            tenantId,
            userId: RequestContext.get()?.userId ?? SYSTEM_USER_ID,
            action: entity.status === 'OPEN' ? 'PERIOD_REOPENED' : `PERIOD_${entity.status}`,
            entityType: 'fiscal_period',
            entityId: entity.id,
            source: 'GL',
            oldValues: { status: previous.status },
            newValues: { status: entity.status },
        });
    }
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting && pnpm --filter @devloggers/api typecheck`
Expected: 6 new tests pass, no regressions; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/accounting/opening-balances/sessions apps/api/src/modules/accounting/fiscal-periods/services
git commit -m "feat(accounting): audit opening session post/lock and fiscal period status (Phase 7.2.1/7.2.2)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8 — Base-currency policies record `amount` / `exchangeRate` (prerequisite for check 8)

**Files:**
- Modify: `apps/api/src/modules/accounting/posting/policies/opening-stock.policy.ts`
- Modify: `apps/api/src/modules/accounting/posting/policies/opening-stock.policy.spec.ts`
- Modify: `apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.ts`
- Modify: `apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.spec.ts`

**Interfaces:**
- Produces: every line from these two policies has `amount` = its base amount and `exchangeRate: 1`, so it satisfies `debit + credit = |amount| × exchangeRate`.

Why: `JournalPostingService.post` stores `amount: l.amount ?? 0`. Today these two policies omit `amount`, so each of their lines is stored with `amount = 0` and a non-zero debit/credit, and every one of them would fail check 8. The other policies (invoice, payment, expense, opening balance, opening session) already populate both fields (verified 2026-09-17). Inventory values are base-currency (average cost), matching the existing invoice COGS lines (`amount: cogsBase, exchangeRate: 1`).

- [ ] **Step 1: Update the tests to expect the fields (they will fail)**

In `opening-stock.policy.spec.ts`, replace the first `it` block's expectation:

```ts
        expect(lines).toEqual([
            { accountId: 'inv', debit: 5000, credit: 0, description: null, sortOrder: 0, amount: 5000, exchangeRate: 1 },
            { accountId: 'oe', debit: 0, credit: 5000, description: null, sortOrder: 1, amount: 5000, exchangeRate: 1 },
        ]);
```

and add, after the rounding test:

```ts
    it('records the base amount as the transaction amount at rate 1 (check 8)', async () => {
        const lines = await build().buildLines({ ...baseIntent, totalValue: 123.456789 });
        for (const line of lines) {
            expect(line.amount).toBe(123.4568);
            expect(line.exchangeRate).toBe(1);
        }
    });
```

In `stock-count-adjusted.policy.spec.ts`, replace both expectations:

```ts
        expect(lines).toEqual([
            { accountId: 'inv', debit: 250, credit: 0, description: null, sortOrder: 0, amount: 250, exchangeRate: 1 },
            { accountId: 'adj', debit: 0, credit: 250, description: null, sortOrder: 1, amount: 250, exchangeRate: 1 },
        ]);
```

```ts
        expect(lines).toEqual([
            { accountId: 'inv', debit: 0, credit: 250, description: null, sortOrder: 0, amount: 250, exchangeRate: 1 },
            { accountId: 'adj', debit: 250, credit: 0, description: null, sortOrder: 1, amount: 250, exchangeRate: 1 },
        ]);
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm --filter @devloggers/api test -- opening-stock.policy stock-count-adjusted.policy`
Expected: FAIL — received lines lack `amount` / `exchangeRate`.

- [ ] **Step 3: Implement**

`opening-stock.policy.ts` — replace the `return`:

```ts
        const amt = round(intent.totalValue);
        // Inventory is valued in base currency — amount = base, rate 1 (reconciliation check 8).
        return [
            { accountId: settings.defaultInventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0, amount: amt, exchangeRate: 1 },
            { accountId: settings.defaultOpeningEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1, amount: amt, exchangeRate: 1 },
        ];
```

`stock-count-adjusted.policy.ts` — replace the `return`:

```ts
        // Variance is valued at base-currency average cost — amount = base, rate 1 (reconciliation check 8).
        return [
            { accountId: settings.defaultInventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0, amount: amt, exchangeRate: 1 },
            { accountId: settings.defaultInventoryAdjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1, amount: amt, exchangeRate: 1 },
        ];
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting/posting src/modules/inventory && pnpm --filter @devloggers/api typecheck`
Expected: all pass; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies
git commit -m "fix(accounting): record base amount and rate on opening-stock and stock-count lines

Journal lines from these policies were persisted with amount=0, which breaks
the txn x rate = base invariant (reconciliation check 8).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9 — Checks 2 and 3: projections vs journal-line subledgers (7.4.3, 7.4.4)

**Files:**
- Modify: `apps/api/src/modules/accounting/reconciliation/services/balance-drift.service.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/dto/balance-drift.dto.ts` (descriptions only)
- Modify: `apps/api/src/modules/accounting/reconciliation/services/balance-drift.service.spec.ts`

**Interfaces:**
- Produces: `report.cashboxes` and `report.bankAccounts` keep the same DTO shapes (`CashboxDriftDto`, `BankAccountDriftDto`). What changes is the meaning of `derivedBalance`: it becomes the transaction-currency subledger, Σ over posted lines carrying the dimension of `+|amount|` when `debit > 0`, else `−|amount|`.

Why:
- **Check 2.** Today `checkCashboxes` rebuilds the balance from payment/expense documents plus opening JE lines. ADR-1 makes the ledger the source of truth, and principles check #2 is "Cashbox subledger ↔ `Cashbox.balance`".
- **Check 3.** `checkBankAccounts` compares a transaction-currency column (`BankAccount.balance`) with base-currency Σ(debit−credit). That is wrong whenever the bank account is not in the base currency.
- **Sign convention.** `Cashbox.balance` is kept in the cashbox's own currency (payments/expenses increment it by `amount`, and openings by the signed session amount). Every posting policy puts `cashboxId`/`bankAccountId` on the cash-side line, where a debit means money in.

- [ ] **Step 1: Rewrite the stub and the cashbox tests (they will fail)**

In `balance-drift.service.spec.ts`:

1. In `interface PrismaStub`, **remove** `payments` and `expenses` and **add**:

```ts
    /** Rows returned by the cashbox / bank-account subledger $queryRaw. */
    cashboxSubledger?: Array<{ dimensionId: string; balance: string }>;
    bankAccountSubledger?: Array<{ dimensionId: string; balance: string }>;
```

2. Replace `makeService` with the version below. The raw-query stub dispatches on the SQL text; Task 10 extends it.

```ts
function makeService(stub: PrismaStub = {}): BalanceDriftService {
    const prisma = {
        cashbox: { findMany: async () => stub.cashboxes ?? [] },
        stockBalance: { findMany: async () => stub.stockBalances ?? [] },
        stockMovement: { groupBy: async () => stub.stockMovements ?? [] },
        journalLine: { groupBy: async () => stub.journalLines ?? [] },
        journalEntry: { findMany: async () => stub.journalEntries ?? [] },
        financialSetting: { findFirst: async () => stub.financialSetting ?? null },
        bankAccount: { findMany: async () => stub.bankAccounts ?? [] },
        $queryRaw: async (strings: TemplateStringsArray) => {
            const sql = strings.join('?');
            if (sql.includes('jl.cashbox_id IS NOT NULL')) return stub.cashboxSubledger ?? [];
            if (sql.includes('jl.bank_account_id IS NOT NULL')) return stub.bankAccountSubledger ?? [];
            return [];
        },
    };
    return new BalanceDriftService(prisma as never);
}
```

3. Replace the whole `describe('BalanceDriftService — cashbox balance', ...)` block with:

```ts
describe('BalanceDriftService — check 2: cashbox subledger vs Cashbox.balance', () => {
    it('is quiet when the projection equals the signed transaction-currency subledger', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 700 }],
            cashboxSubledger: [{ dimensionId: 'cb1', balance: '700.0000' }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([]);
        expect(report.clean).toBe(true);
    });

    it('reports the signed difference when the projection is stale', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 950 }],
            cashboxSubledger: [{ dimensionId: 'cb1', balance: '900' }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([
            { cashboxId: 'cb1', code: 'CASH-USD', cachedBalance: 950, derivedBalance: 900, difference: 50 },
        ]);
        expect(report.clean).toBe(false);
    });

    it('treats a cashbox with no posted lines as a zero subledger', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 10 }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([
            { cashboxId: 'cb1', code: 'CASH-USD', cachedBalance: 10, derivedBalance: 0, difference: 10 },
        ]);
    });
});

describe('BalanceDriftService — check 3: bank subledger vs BankAccount.balance', () => {
    it('compares in transaction currency, so a foreign-currency account is not flagged for its base value', async () => {
        const report = await makeService({
            bankAccounts: [{ id: 'ba1', code: 'BANK-EUR', balance: 100 }],
            bankAccountSubledger: [{ dimensionId: 'ba1', balance: '100' }],
            journalLines: [{ journalEntryId: 'je1', _sum: { debit: 110, credit: 0 } } as never],
        }).getReport('t1');

        expect(report.bankAccounts).toEqual([]);
    });

    it('reports a stale bank projection', async () => {
        const report = await makeService({
            bankAccounts: [{ id: 'ba1', code: 'BANK-EUR', balance: 120 }],
            bankAccountSubledger: [{ dimensionId: 'ba1', balance: '100' }],
        }).getReport('t1');

        expect(report.bankAccounts).toEqual([
            { bankAccountId: 'ba1', code: 'BANK-EUR', cachedBalance: 120, derivedBalance: 100, difference: 20 },
        ]);
    });
});
```

In the first bank test, the `journalLines` fixture is a base-currency sum of 110 that the old implementation would have compared against 100. Keeping it pins that the new check ignores it.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm --filter @devloggers/api test -- balance-drift.service`
Expected: FAIL — the cashbox tests report drift because the service still reads `payment.groupBy`, which is no longer stubbed (TypeError) — and the bank test flags 110 vs 100.

- [ ] **Step 3: Implement**

In `balance-drift.service.ts`:

1. Remove the now-unused import `import { ReferenceType } from '@devloggers/db-prisma';`.

2. Add near the other helpers:

```ts
interface SubledgerRow {
    dimensionId: string;
    balance: string | null;
}

interface ProjectionDrift {
    id: string;
    code: string;
    cached: number;
    derived: number;
    difference: number;
}

/** Projection column vs subledger, keyed by dimension id. Missing subledger = 0. */
function diffProjection(
    rows: Array<{ id: string; code: string; balance: unknown }>,
    subledger: SubledgerRow[],
): ProjectionDrift[] {
    const derivedById = new Map(subledger.map((s) => [s.dimensionId, num(s.balance)]));
    const results: ProjectionDrift[] = [];
    for (const row of rows) {
        const cached = num(row.balance);
        const derived = derivedById.get(row.id) ?? 0;
        if (drifted(cached, derived)) {
            results.push({ id: row.id, code: row.code, cached, derived, difference: Number((cached - derived).toFixed(4)) });
        }
    }
    return results;
}
```

3. Replace the whole `checkCashboxes` method:

```ts
    /**
     * Check #2 — `Cashbox.balance` (the cashbox's own currency) vs the cashbox
     * subledger: Σ over posted journal lines carrying this cashboxId of +|amount|
     * on the debit side (money in) and −|amount| on the credit side. ADR-1: the
     * ledger is the truth, the column is an operational projection.
     */
    private async checkCashboxes(tenantId: string): Promise<CashboxDriftDto[]> {
        const [boxes, subledger] = await Promise.all([
            this.prisma.cashbox.findMany({
                where: { tenantId },
                select: { id: true, code: true, balance: true },
            }),
            this.prisma.$queryRaw<SubledgerRow[]>`
                SELECT jl.cashbox_id AS "dimensionId",
                       SUM(CASE WHEN jl.debit > 0 THEN ABS(jl.amount) ELSE -ABS(jl.amount) END)::text AS "balance"
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                WHERE jl.tenant_id = ${tenantId}
                  AND je.status = 'POSTED'
                  AND jl.cashbox_id IS NOT NULL
                GROUP BY jl.cashbox_id`,
        ]);

        return diffProjection(boxes, subledger).map((d) => ({
            cashboxId: d.id,
            code: d.code,
            cachedBalance: d.cached,
            derivedBalance: d.derived,
            difference: d.difference,
        }));
    }
```

4. Replace the whole `checkBankAccounts` method:

```ts
    /**
     * Check #3 (projection half) — `BankAccount.balance` (account currency) vs the
     * bankAccountId subledger in transaction currency. Same sign rule as check #2.
     */
    private async checkBankAccounts(tenantId: string): Promise<BankAccountDriftDto[]> {
        const [accounts, subledger] = await Promise.all([
            this.prisma.bankAccount.findMany({
                where: { tenantId },
                select: { id: true, code: true, balance: true },
            }),
            this.prisma.$queryRaw<SubledgerRow[]>`
                SELECT jl.bank_account_id AS "dimensionId",
                       SUM(CASE WHEN jl.debit > 0 THEN ABS(jl.amount) ELSE -ABS(jl.amount) END)::text AS "balance"
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                WHERE jl.tenant_id = ${tenantId}
                  AND je.status = 'POSTED'
                  AND jl.bank_account_id IS NOT NULL
                GROUP BY jl.bank_account_id`,
        ]);

        return diffProjection(accounts, subledger).map((d) => ({
            bankAccountId: d.id,
            code: d.code,
            cachedBalance: d.cached,
            derivedBalance: d.derived,
            difference: d.difference,
        }));
    }
```

Column names were verified against `accounting.prisma` (`journal_lines.cashbox_id`, `bank_account_id`, `journal_entry_id`, `tenant_id`; `journal_entries.status`, unmapped). Comparing the `JournalEntryStatus` enum column to the literal `'POSTED'` is valid in PostgreSQL.

5. In `balance-drift.dto.ts`, update the two descriptions only:

```ts
    @ApiProperty({
        type: 'number',
        example: 14750,
        description: 'Cashbox subledger in cashbox currency: Σ ±|amount| over posted journal lines carrying this cashboxId',
    })
    derivedBalance: number = 0;
```

```ts
    @ApiProperty({ type: 'number', description: 'Bank subledger in account currency: Σ ±|amount| over posted journal lines carrying this bankAccountId' })
    derivedBalance: number = 0;
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- balance-drift.service && pnpm --filter @devloggers/api typecheck`
Expected: all pass; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/reconciliation
git commit -m "feat(reconciliation): reconcile cashbox and bank projections to journal-line subledgers (Phase 7.4.3/7.4.4)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10 — Check 6 (inventory valuation), check 8 (multi-currency), AR/AP side (7.4.5–7.4.8)

**Files:**
- Modify: `apps/api/src/modules/accounting/reconciliation/dto/balance-drift.dto.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/services/balance-drift.service.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/services/balance-drift.service.spec.ts`
- Regenerated: `apps/api/openapi.yaml`, `packages/api-contracts/types/index.ts`

**Interfaces:**
- Produces (on `BalanceDriftReportDto`):
  - `inventoryValuation: InventoryValuationDriftDto[]` — `{ inventoryAccountId: string; glBalance: number; stockValuation: number; difference: number }` (0 or 1 element)
  - `multiCurrencyLines: MultiCurrencyLineDriftDto[]` — `{ journalLineId: string; journalEntryNumber: string; amount: number; exchangeRate: number; baseAmount: number; expectedBaseAmount: number; difference: number; reason: 'RATE_MISMATCH' | 'MISSING_AMOUNT' }`
  - `PartySubledgerDriftDto.side: 'AR' | 'AP'`
  - `clean` also requires both new sections to be empty; `notChecked` lists check 6 when no Inventory account is configured
- Constants: `INVENTORY_TOLERANCE = 0.01`, `MAX_FX_FINDINGS = 200`

Design notes:
- **Check 6.** Inventory GL = Σ(debit−credit) on `defaultInventoryAccountId` (base currency). Stock valuation = Σ(`quantity × unitCost`) over all movements; `quantity` is signed and `unitCost` is base currency (purchases convert at the invoice rate; sales, counts and transfers use average cost). The GL rounds once per document while the movement sum is unrounded per line, so the tolerance is `0.01` rather than `0.0001`.
- **Check 8.** Uses `debit + credit` because a line carries value on exactly one side. `ABS(amount)` because opening lines may be signed. The comparison threshold is written as a SQL literal, so it stays exact `numeric` comparison with no float parameter binding.

- [ ] **Step 1: Write the failing tests**

In `balance-drift.service.spec.ts`, extend the stub interface:

```ts
    inventoryGl?: { debit: number; credit: number };
    stockValuation?: string | null;
    fxLines?: Array<{ journalLineId: string; journalEntryNumber: string; amount: string; exchangeRate: string; baseAmount: string }>;
```

and extend `financialSetting` in the stub interface with `defaultInventoryAccountId?: string | null;`.

Also add `partyGlOnly?: boolean;`. When it is set, the stub returns `[]` for the party-subledger `groupBy` (the one whose `where` filters on `partyId`), so the GL side and the subledger side differ. The existing stub returns the same rows for every `groupBy`, which can never produce a party difference. Dispatching on the query arguments, rather than counting calls, keeps the stub independent of the order in which the parallel checks run.

In `makeService`, change `journalLine` and add the new dispatch branches:

```ts
        journalLine: {
            groupBy: async (args: { where?: { partyId?: unknown } }) =>
                stub.partyGlOnly === true && args.where?.partyId !== undefined ? [] : stub.journalLines ?? [],
            aggregate: async () => ({ _sum: stub.inventoryGl ?? { debit: 0, credit: 0 } }),
        },
```

```ts
        $queryRaw: async (strings: TemplateStringsArray) => {
            const sql = strings.join('?');
            if (sql.includes('jl.cashbox_id IS NOT NULL')) return stub.cashboxSubledger ?? [];
            if (sql.includes('jl.bank_account_id IS NOT NULL')) return stub.bankAccountSubledger ?? [];
            if (sql.includes('FROM stock_movements')) return [{ value: stub.stockValuation ?? null }];
            if (sql.includes('ROUND(ABS(jl.amount)')) return stub.fxLines ?? [];
            return [];
        },
```

Append these describe blocks:

```ts
describe('BalanceDriftService — check 6: inventory GL vs stock valuation', () => {
    it('is skipped (and says so) when no Inventory account is configured', async () => {
        const report = await makeService({ stockValuation: '500' }).getReport('t1');
        expect(report.inventoryValuation).toEqual([]);
        expect(report.notChecked.join(' ')).toContain('Check 6');
    });

    it('is quiet within the per-document rounding tolerance', async () => {
        const report = await makeService({
            financialSetting: { defaultInventoryAccountId: 'inv' },
            inventoryGl: { debit: 1000, credit: 400 },
            stockValuation: '599.996',
        }).getReport('t1');
        expect(report.inventoryValuation).toEqual([]);
        expect(report.notChecked.join(' ')).not.toContain('Check 6');
    });

    it('reports a GL/stock divergence', async () => {
        const report = await makeService({
            financialSetting: { defaultInventoryAccountId: 'inv' },
            inventoryGl: { debit: 1000, credit: 0 },
            stockValuation: '750.5',
        }).getReport('t1');
        expect(report.inventoryValuation).toEqual([
            { inventoryAccountId: 'inv', glBalance: 1000, stockValuation: 750.5, difference: 249.5 },
        ]);
        expect(report.clean).toBe(false);
    });

    it('treats no movements as zero valuation', async () => {
        const report = await makeService({
            financialSetting: { defaultInventoryAccountId: 'inv' },
            inventoryGl: { debit: 0, credit: 0 },
            stockValuation: null,
        }).getReport('t1');
        expect(report.inventoryValuation).toEqual([]);
    });
});

describe('BalanceDriftService — check 8: txn amount × rate = base', () => {
    it('is quiet when the query finds no offending line', async () => {
        const report = await makeService().getReport('t1');
        expect(report.multiCurrencyLines).toEqual([]);
    });

    it('classifies a wrong base as RATE_MISMATCH', async () => {
        const report = await makeService({
            fxLines: [{ journalLineId: 'jl1', journalEntryNumber: 'JE-000007', amount: '100.0000', exchangeRate: '1.100000', baseAmount: '100.0000' }],
        }).getReport('t1');
        expect(report.multiCurrencyLines).toEqual([
            {
                journalLineId: 'jl1',
                journalEntryNumber: 'JE-000007',
                amount: 100,
                exchangeRate: 1.1,
                baseAmount: 100,
                expectedBaseAmount: 110,
                difference: -10,
                reason: 'RATE_MISMATCH',
            },
        ]);
        expect(report.clean).toBe(false);
    });

    it('classifies a legacy line with no transaction amount as MISSING_AMOUNT', async () => {
        const report = await makeService({
            fxLines: [{ journalLineId: 'jl2', journalEntryNumber: 'JE-000001', amount: '0.0000', exchangeRate: '1.000000', baseAmount: '250.0000' }],
        }).getReport('t1');
        expect(report.multiCurrencyLines[0]).toMatchObject({ reason: 'MISSING_AMOUNT', expectedBaseAmount: 0, difference: 250 });
    });
});

describe('BalanceDriftService — checks 4/5: party subledger side', () => {
    it('labels each finding AR or AP by its control account', async () => {
        // GL side has a USD balance, party-subledger side is empty → one finding per control account.
        const report = await makeService({
            financialSetting: { defaultReceivableAccountId: 'ar', defaultPayableAccountId: 'ap' },
            partyGlOnly: true,
            journalLines: [{ currencyId: 'USD', _sum: { debit: 10, credit: 0 } } as never],
        }).getReport('t1');
        expect(report.partySubledgers.map((p) => [p.controlAccountId, p.side])).toEqual(
            expect.arrayContaining([
                ['ar', 'AR'],
                ['ap', 'AP'],
            ]),
        );
    });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm --filter @devloggers/api test -- balance-drift.service`
Expected: FAIL — `inventoryValuation` / `multiCurrencyLines` are `undefined`, `side` is missing.

- [ ] **Step 3: Add the DTOs**

In `balance-drift.dto.ts`, add `side` to `PartySubledgerDriftDto` (right after `controlAccountId`):

```ts
    @ApiProperty({ enum: ['AR', 'AP'], enumName: 'PartySubledgerSide', description: 'AR = check 4 (customers), AP = check 5 (suppliers)' })
    side: 'AR' | 'AP' = 'AR';
```

Add two classes before `BalanceDriftReportDto`:

```ts
export class InventoryValuationDriftDto {
    @ApiProperty({ type: 'string', description: 'FinancialSetting.defaultInventoryAccountId' })
    inventoryAccountId: string = '';

    @ApiProperty({ type: 'number', example: 1000, description: 'Σ(debit−credit) on the Inventory control account (base currency)' })
    glBalance: number = 0;

    @ApiProperty({ type: 'number', example: 750.5, description: 'Σ(quantity × unitCost) over all stock movements (base currency)' })
    stockValuation: number = 0;

    @ApiProperty({ type: 'number', example: 249.5, description: 'gl − stock; flagged beyond 0.01' })
    difference: number = 0;
}

export enum MultiCurrencyDriftReason {
    RATE_MISMATCH = 'RATE_MISMATCH',
    MISSING_AMOUNT = 'MISSING_AMOUNT',
}

export class MultiCurrencyLineDriftDto {
    @ApiProperty({ type: 'string' })
    journalLineId: string = '';

    @ApiProperty({ type: 'string', example: 'JE-000007' })
    journalEntryNumber: string = '';

    @ApiProperty({ type: 'number', example: 100, description: 'Transaction-currency amount stored on the line' })
    amount: number = 0;

    @ApiProperty({ type: 'number', example: 1.1 })
    exchangeRate: number = 1;

    @ApiProperty({ type: 'number', example: 100, description: 'debit + credit (base currency)' })
    baseAmount: number = 0;

    @ApiProperty({ type: 'number', example: 110, description: '|amount| × exchangeRate rounded to 4 dp' })
    expectedBaseAmount: number = 0;

    @ApiProperty({ type: 'number', example: -10 })
    difference: number = 0;

    @ApiProperty({ enum: MultiCurrencyDriftReason, enumName: 'MultiCurrencyDriftReason' })
    reason: MultiCurrencyDriftReason = MultiCurrencyDriftReason.RATE_MISMATCH;
}
```

Add two properties to `BalanceDriftReportDto` (after `bankAccounts`):

```ts
    @ApiProperty({ type: () => InventoryValuationDriftDto, isArray: true, description: 'Check 6' })
    inventoryValuation: InventoryValuationDriftDto[] = [];

    @ApiProperty({ type: () => MultiCurrencyLineDriftDto, isArray: true, description: 'Check 8 — capped at 200 lines' })
    multiCurrencyLines: MultiCurrencyLineDriftDto[] = [];
```

The test uses string literals (`reason: 'RATE_MISMATCH'`). A string enum value equals its literal at runtime, so `toEqual` passes.

- [ ] **Step 4: Implement in the service**

1. Extend the DTO import list with `InventoryValuationDriftDto`, `MultiCurrencyLineDriftDto`, `MultiCurrencyDriftReason`.

2. Replace the `NOT_CHECKED` constant and add the new constants:

```ts
const NOT_CHECKED = [
    'StockBalance.averageCost — a running weighted average whose recomputation requires replaying every movement in order. Check 6 validates total valuation against the GL instead.',
    'ChartOfAccount.currentBalance — no longer exists. Removed in the CoA refactor; account balances are computed from JournalLine on read, so the cache cannot drift.',
];

/** Check 6: GL rounds per document, the movement sum per line. */
const INVENTORY_TOLERANCE = 0.01;
/** Check 8: bound the report if a posting path is systemically wrong. */
const MAX_FX_FINDINGS = 200;
const CHECK_6_SKIPPED = 'Check 6 (Inventory GL vs stock valuation) — no default Inventory account in Financial Settings.';
```

3. Replace `getReport`:

```ts
    async getReport(tenantId: string): Promise<BalanceDriftReportDto> {
        const [
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            inventory,
            multiCurrencyLines,
        ] = await Promise.all([
            this.checkCashboxes(tenantId),
            this.checkStockBalances(tenantId),
            this.checkJournalEntryBalance(tenantId),
            this.checkCashSubledgers(tenantId),
            this.checkPartySubledgers(tenantId),
            this.checkBankSubledgers(tenantId),
            this.checkBankAccounts(tenantId),
            this.checkInventoryValuation(tenantId),
            this.checkMultiCurrencyLines(tenantId),
        ]);

        const sections = [
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            inventory.findings,
            multiCurrencyLines,
        ];

        return {
            generatedAt: new Date().toISOString(),
            clean: sections.every((section) => section.length === 0),
            cashboxes,
            stockBalances,
            unbalancedEntries,
            cashSubledgers,
            partySubledgers,
            bankSubledgers,
            bankAccounts,
            inventoryValuation: inventory.findings,
            multiCurrencyLines,
            notChecked: inventory.skipped ? [...NOT_CHECKED, CHECK_6_SKIPPED] : NOT_CHECKED,
        };
    }
```

4. In `checkPartySubledgers`, replace the `controls` construction and the push so each finding carries its side:

```ts
        const controls: Array<{ accountId: string; side: 'AR' | 'AP' }> = [];
        if (settings?.defaultReceivableAccountId) controls.push({ accountId: settings.defaultReceivableAccountId, side: 'AR' });
        if (settings?.defaultPayableAccountId) controls.push({ accountId: settings.defaultPayableAccountId, side: 'AP' });
        const results: PartySubledgerDriftDto[] = [];

        for (const { accountId, side } of controls) {
```

and inside the inner loop:

```ts
                results.push({
                    controlAccountId: accountId,
                    side,
                    currencyId,
                    glBalance,
                    subledgerBalance,
                    difference: Number((glBalance - subledgerBalance).toFixed(4)),
                });
```

5. Add the two new checks before `diffPerCurrency`:

```ts
    /**
     * Check #6 — Inventory control GL (base) vs Σ(quantity × unitCost) over every
     * stock movement (base: purchases convert at the invoice rate; sales, counts and
     * transfers use average cost). Skipped, and listed in notChecked, when the tenant
     * has no Inventory account — perpetual inventory is not configured.
     */
    private async checkInventoryValuation(
        tenantId: string,
    ): Promise<{ findings: InventoryValuationDriftDto[]; skipped: boolean }> {
        const settings = await this.prisma.financialSetting.findFirst({ where: { tenantId } });
        const inventoryAccountId = settings?.defaultInventoryAccountId;
        if (!inventoryAccountId) return { findings: [], skipped: true };

        const [gl, valuation] = await Promise.all([
            this.prisma.journalLine.aggregate({
                where: { tenantId, accountId: inventoryAccountId, journalEntry: { status: 'POSTED' } },
                _sum: { debit: true, credit: true },
            }),
            this.prisma.$queryRaw<Array<{ value: string | null }>>`
                SELECT SUM(sm.quantity * sm.unit_cost)::text AS "value"
                FROM stock_movements sm
                WHERE sm.tenant_id = ${tenantId}`,
        ]);

        const glBalance = Number((num(gl._sum.debit) - num(gl._sum.credit)).toFixed(4));
        const stockValuation = Number(num(valuation[0]?.value).toFixed(4));
        if (Math.abs(glBalance - stockValuation) <= INVENTORY_TOLERANCE) return { findings: [], skipped: false };

        return {
            findings: [
                {
                    inventoryAccountId,
                    glBalance,
                    stockValuation,
                    difference: Number((glBalance - stockValuation).toFixed(4)),
                },
            ],
            skipped: false,
        };
    }

    /**
     * Check #8 — every posted line satisfies (debit + credit) = ROUND(|amount| × rate, 4).
     * A line with amount 0 and a non-zero base was written by a path that never recorded
     * its transaction amount (MISSING_AMOUNT); anything else is RATE_MISMATCH.
     */
    private async checkMultiCurrencyLines(tenantId: string): Promise<MultiCurrencyLineDriftDto[]> {
        const rows = await this.prisma.$queryRaw<
            Array<{ journalLineId: string; journalEntryNumber: string; amount: string; exchangeRate: string; baseAmount: string }>
        >`
            SELECT jl.id AS "journalLineId",
                   je.number AS "journalEntryNumber",
                   jl.amount::text AS "amount",
                   jl.exchange_rate::text AS "exchangeRate",
                   (jl.debit + jl.credit)::text AS "baseAmount"
            FROM journal_lines jl
            JOIN journal_entries je ON je.id = jl.journal_entry_id
            WHERE jl.tenant_id = ${tenantId}
              AND je.status = 'POSTED'
              AND ABS((jl.debit + jl.credit) - ROUND(ABS(jl.amount) * jl.exchange_rate, 4)) > 0.0001
            ORDER BY je.number, jl.sort_order
            LIMIT ${MAX_FX_FINDINGS}`;

        return rows.map((row) => {
            const amount = num(row.amount);
            const exchangeRate = num(row.exchangeRate);
            const baseAmount = num(row.baseAmount);
            const expectedBaseAmount = Number((Math.abs(amount) * exchangeRate).toFixed(4));
            return {
                journalLineId: row.journalLineId,
                journalEntryNumber: row.journalEntryNumber,
                amount,
                exchangeRate,
                baseAmount,
                expectedBaseAmount,
                difference: Number((baseAmount - expectedBaseAmount).toFixed(4)),
                reason: amount === 0 ? MultiCurrencyDriftReason.MISSING_AMOUNT : MultiCurrencyDriftReason.RATE_MISMATCH,
            };
        });
    }
```

6. Update the controller's `@ApiOperation` description in `balance-drift.controller.ts` so it matches the new scope:

```ts
        description:
            'Runs the reconciliation stack (00-accounting-principles.md): cash/bank/AR/AP control ' +
            'accounts vs their subledgers, cashbox and bank projections vs subledger, inventory GL vs ' +
            'stock valuation, journal-entry balance, txn amount × rate = base, and stock quantity ' +
            'projection. Read-only. Pre-existing drift is not a regression; only an increase is ' +
            '(see ReconciliationRun).',
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- balance-drift.service && pnpm --filter @devloggers/api typecheck`
Expected: all pass; typecheck exits 0.

- [ ] **Step 6: Regenerate contracts**

Run: `pnpm generate`
Expected: exits 0. `grep -n "InventoryValuationDriftDto\|MultiCurrencyLineDriftDto\|PartySubledgerSide" packages/api-contracts/types/index.ts` shows all three.
Then run `pnpm --filter @devloggers/dashboard typecheck`. Expected: exits 0; the dashboard does not consume the drift report today (`grep -rn "balance-drift\|BalanceDrift" apps/dashboard` is empty).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/accounting/reconciliation apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(reconciliation): inventory valuation (check 6), txn x rate = base (check 8), AR/AP side (Phase 7.4.5-7.4.8)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

`openapi.yaml` and `types/index.ts` had unrelated uncommitted changes before this phase started. Run `git diff` on both first. If they contain changes not produced by this task, commit those separately or ask the branch owner, rather than folding them into this commit.

---

## Task 11 — `BusinessSetupReconciliationService`: the 8 numbered checks + finding fingerprints (7.4.1)

**Files:**
- Create: `apps/api/src/modules/accounting/reconciliation/dto/reconciliation.dto.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/reconciliation-checks.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/reconciliation-checks.spec.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/services/business-setup-reconciliation.service.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/services/business-setup-reconciliation.service.spec.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/reconciliation.module.ts`

**Interfaces:**
- Consumes: `BalanceDriftService.getReport(tenantId): Promise<BalanceDriftReportDto>` with the Task 10 sections
- Produces:
  - `enum ReconciliationCheckCode { CASH_GL_VS_CASHBOX_SUBLEDGER, CASHBOX_SUBLEDGER_VS_PROJECTION, BANK_GL_VS_BANK_SUBLEDGER, AR_CONTROL_VS_CUSTOMER_SUBLEDGER, AP_CONTROL_VS_SUPPLIER_SUBLEDGER, INVENTORY_GL_VS_STOCK_VALUATION, JOURNAL_ENTRIES_BALANCED, MULTI_CURRENCY_BASE_CONSISTENT, STOCK_QUANTITY_PROJECTION }` (string enum, value = name)
  - `class ReconciliationCheckResultDto { number: number | null; code: ReconciliationCheckCode; passed: boolean; findingCount: number }`
  - `class ReconciliationResultDto { generatedAt: string; passed: boolean; checks: ReconciliationCheckResultDto[]; report: BalanceDriftReportDto }`
  - `buildChecks(report: BalanceDriftReportDto): ReconciliationCheckResultDto[]` — always 9 entries, in stack order (checks 1–8, then supplementary `STOCK_QUANTITY_PROJECTION` with `number: null`)
  - `fingerprintReport(report: BalanceDriftReportDto): Record<string, number>` — stable finding key → `|difference|`
  - `diffNewFindings(previous: Record<string, number> | null, current: Record<string, number>): string[]` — sorted keys that are new, or whose magnitude grew by more than `0.0001`; `previous === null` (first run) → `[]`
  - `parseFindings(value: unknown): Record<string, number>`
  - `BusinessSetupReconciliationService.evaluate(tenantId: string): Promise<ReconciliationResultDto>`

Fingerprint keys (stable across runs, so "the same drift" is recognised):

| Section | Key |
|---------|-----|
| `cashSubledgers` | `CASH_GL:<currencyId or base>` |
| `cashboxes` | `CASHBOX:<cashboxId>` |
| `bankSubledgers` | `BANK_GL:<currencyId or base>` |
| `bankAccounts` | `BANK_ACCOUNT:<bankAccountId>` |
| `partySubledgers` | `PARTY_<side>:<controlAccountId>:<currencyId or base>` |
| `inventoryValuation` | `INVENTORY_GL:<inventoryAccountId>` |
| `unbalancedEntries` | `JE_UNBALANCED:<journalEntryId>` |
| `multiCurrencyLines` | `FX_LINE:<journalLineId>` |
| `stockBalances` | `STOCK_QTY:<warehouseId>:<itemId>` |

- [ ] **Step 1: Write the failing pure-function tests**

`apps/api/src/modules/accounting/reconciliation/reconciliation-checks.spec.ts`:

```ts
import { BalanceDriftReportDto, MultiCurrencyDriftReason } from './dto/balance-drift.dto';
import { ReconciliationCheckCode } from './dto/reconciliation.dto';
import { buildChecks, diffNewFindings, fingerprintReport, parseFindings } from './reconciliation-checks';

function report(patch: Partial<BalanceDriftReportDto> = {}): BalanceDriftReportDto {
    return { ...new BalanceDriftReportDto(), generatedAt: '2026-09-17T03:00:00.000Z', ...patch };
}

describe('buildChecks', () => {
    it('lists the 8 stack checks in order plus the supplementary stock-quantity check, all passing on a clean report', () => {
        const checks = buildChecks(report());
        expect(checks.map((c) => [c.number, c.code, c.passed, c.findingCount])).toEqual([
            [1, ReconciliationCheckCode.CASH_GL_VS_CASHBOX_SUBLEDGER, true, 0],
            [2, ReconciliationCheckCode.CASHBOX_SUBLEDGER_VS_PROJECTION, true, 0],
            [3, ReconciliationCheckCode.BANK_GL_VS_BANK_SUBLEDGER, true, 0],
            [4, ReconciliationCheckCode.AR_CONTROL_VS_CUSTOMER_SUBLEDGER, true, 0],
            [5, ReconciliationCheckCode.AP_CONTROL_VS_SUPPLIER_SUBLEDGER, true, 0],
            [6, ReconciliationCheckCode.INVENTORY_GL_VS_STOCK_VALUATION, true, 0],
            [7, ReconciliationCheckCode.JOURNAL_ENTRIES_BALANCED, true, 0],
            [8, ReconciliationCheckCode.MULTI_CURRENCY_BASE_CONSISTENT, true, 0],
            [null, ReconciliationCheckCode.STOCK_QUANTITY_PROJECTION, true, 0],
        ]);
    });

    it('splits party findings into AR (4) and AP (5), and counts bank GL + projection under 3', () => {
        const checks = buildChecks(
            report({
                partySubledgers: [
                    { controlAccountId: 'ar', side: 'AR', currencyId: 'USD', glBalance: 1, subledgerBalance: 0, difference: 1 },
                    { controlAccountId: 'ap', side: 'AP', currencyId: null, glBalance: 2, subledgerBalance: 0, difference: 2 },
                    { controlAccountId: 'ap', side: 'AP', currencyId: 'USD', glBalance: 3, subledgerBalance: 0, difference: 3 },
                ],
                bankSubledgers: [{ currencyId: null, glBalance: 1, subledgerBalance: 0, difference: 1 }],
                bankAccounts: [{ bankAccountId: 'ba1', code: 'B', cachedBalance: 1, derivedBalance: 0, difference: 1 }],
            }),
        );
        const byNumber = new Map(checks.map((c) => [c.number, c]));
        expect(byNumber.get(3)).toMatchObject({ passed: false, findingCount: 2 });
        expect(byNumber.get(4)).toMatchObject({ passed: false, findingCount: 1 });
        expect(byNumber.get(5)).toMatchObject({ passed: false, findingCount: 2 });
        expect(byNumber.get(1)?.passed).toBe(true);
    });
});

describe('fingerprintReport', () => {
    it('produces one stable key per finding with its absolute difference', () => {
        expect(
            fingerprintReport(
                report({
                    cashSubledgers: [{ currencyId: null, glBalance: 5, subledgerBalance: 7, difference: -2 }],
                    cashboxes: [{ cashboxId: 'cb1', code: 'C', cachedBalance: 1, derivedBalance: 0, difference: 1 }],
                    partySubledgers: [{ controlAccountId: 'ar', side: 'AR', currencyId: 'USD', glBalance: 1, subledgerBalance: 0, difference: 1 }],
                    inventoryValuation: [{ inventoryAccountId: 'inv', glBalance: 10, stockValuation: 4, difference: 6 }],
                    unbalancedEntries: [{ journalEntryId: 'je1', number: 'JE-1', totalDebit: 1, totalCredit: 0.5, difference: 0.5 }],
                    multiCurrencyLines: [
                        {
                            journalLineId: 'jl1',
                            journalEntryNumber: 'JE-2',
                            amount: 0,
                            exchangeRate: 1,
                            baseAmount: 3,
                            expectedBaseAmount: 0,
                            difference: 3,
                            reason: MultiCurrencyDriftReason.MISSING_AMOUNT,
                        },
                    ],
                    stockBalances: [{ warehouseId: 'w1', itemId: 'i1', cachedQuantity: 1, derivedQuantity: 3, difference: -2 }],
                }),
            ),
        ).toEqual({
            'CASH_GL:base': 2,
            'CASHBOX:cb1': 1,
            'PARTY_AR:ar:USD': 1,
            'INVENTORY_GL:inv': 6,
            'JE_UNBALANCED:je1': 0.5,
            'FX_LINE:jl1': 3,
            'STOCK_QTY:w1:i1': 2,
        });
    });
});

describe('diffNewFindings', () => {
    it('treats the first run as the baseline — nothing is "new"', () => {
        expect(diffNewFindings(null, { 'CASHBOX:cb1': 5 })).toEqual([]);
    });

    it('reports keys that appeared since the previous run', () => {
        expect(diffNewFindings({ 'CASHBOX:cb1': 5 }, { 'CASHBOX:cb1': 5, 'FX_LINE:jl9': 1 })).toEqual(['FX_LINE:jl9']);
    });

    it('reports existing findings whose magnitude grew, not ones that shrank or held', () => {
        expect(
            diffNewFindings(
                { 'CASHBOX:cb1': 5, 'CASHBOX:cb2': 5, 'CASHBOX:cb3': 5 },
                { 'CASHBOX:cb1': 5.00005, 'CASHBOX:cb2': 7, 'CASHBOX:cb3': 1 },
            ),
        ).toEqual(['CASHBOX:cb2']);
    });

    it('returns keys sorted for deterministic storage and alerts', () => {
        expect(diffNewFindings({}, { 'Z:1': 1, 'A:1': 1 })).toEqual(['A:1', 'Z:1']);
    });
});

describe('parseFindings', () => {
    it('keeps numeric entries and rejects anything else', () => {
        expect(parseFindings({ a: 1, b: 'x', c: null })).toEqual({ a: 1 });
        expect(parseFindings(null)).toEqual({});
        expect(parseFindings(['a'])).toEqual({});
    });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- reconciliation-checks`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the DTOs and pure functions**

`apps/api/src/modules/accounting/reconciliation/dto/reconciliation.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { BalanceDriftReportDto } from './balance-drift.dto';

/** Reconciliation stack — 00-accounting-principles.md. Response DTOs: initializers, not `!`. */
export enum ReconciliationCheckCode {
    CASH_GL_VS_CASHBOX_SUBLEDGER = 'CASH_GL_VS_CASHBOX_SUBLEDGER',
    CASHBOX_SUBLEDGER_VS_PROJECTION = 'CASHBOX_SUBLEDGER_VS_PROJECTION',
    BANK_GL_VS_BANK_SUBLEDGER = 'BANK_GL_VS_BANK_SUBLEDGER',
    AR_CONTROL_VS_CUSTOMER_SUBLEDGER = 'AR_CONTROL_VS_CUSTOMER_SUBLEDGER',
    AP_CONTROL_VS_SUPPLIER_SUBLEDGER = 'AP_CONTROL_VS_SUPPLIER_SUBLEDGER',
    INVENTORY_GL_VS_STOCK_VALUATION = 'INVENTORY_GL_VS_STOCK_VALUATION',
    JOURNAL_ENTRIES_BALANCED = 'JOURNAL_ENTRIES_BALANCED',
    MULTI_CURRENCY_BASE_CONSISTENT = 'MULTI_CURRENCY_BASE_CONSISTENT',
    STOCK_QUANTITY_PROJECTION = 'STOCK_QUANTITY_PROJECTION',
}

export class ReconciliationCheckResultDto {
    @ApiProperty({ type: 'number', nullable: true, example: 1, description: 'Position in the 8-check stack; null = supplementary check' })
    number: number | null = null;

    @ApiProperty({ enum: ReconciliationCheckCode, enumName: 'ReconciliationCheckCode' })
    code: ReconciliationCheckCode = ReconciliationCheckCode.CASH_GL_VS_CASHBOX_SUBLEDGER;

    @ApiProperty({ type: 'boolean', example: true })
    passed: boolean = true;

    @ApiProperty({ type: 'number', example: 0 })
    findingCount: number = 0;
}

export class ReconciliationResultDto {
    @ApiProperty({ type: 'string', example: '2026-09-17T03:00:00.000Z' })
    generatedAt: string = '';

    @ApiProperty({ type: 'boolean', example: true, description: 'True when every check passed' })
    passed: boolean = true;

    @ApiProperty({ type: () => ReconciliationCheckResultDto, isArray: true })
    checks: ReconciliationCheckResultDto[] = [];

    @ApiProperty({ type: () => BalanceDriftReportDto, description: 'Full findings behind the check summary' })
    report: BalanceDriftReportDto = new BalanceDriftReportDto();
}
```

`apps/api/src/modules/accounting/reconciliation/reconciliation-checks.ts`:

```ts
import type { BalanceDriftReportDto } from './dto/balance-drift.dto';
import { ReconciliationCheckCode, type ReconciliationCheckResultDto } from './dto/reconciliation.dto';

const GROWTH_TOLERANCE = 0.0001;

function check(number: number | null, code: ReconciliationCheckCode, findingCount: number): ReconciliationCheckResultDto {
    return { number, code, passed: findingCount === 0, findingCount };
}

/** Maps the drift report onto the reconciliation stack (00-accounting-principles.md), in order. */
export function buildChecks(report: BalanceDriftReportDto): ReconciliationCheckResultDto[] {
    const ar = report.partySubledgers.filter((p) => p.side === 'AR').length;
    const ap = report.partySubledgers.filter((p) => p.side === 'AP').length;
    return [
        check(1, ReconciliationCheckCode.CASH_GL_VS_CASHBOX_SUBLEDGER, report.cashSubledgers.length),
        check(2, ReconciliationCheckCode.CASHBOX_SUBLEDGER_VS_PROJECTION, report.cashboxes.length),
        check(3, ReconciliationCheckCode.BANK_GL_VS_BANK_SUBLEDGER, report.bankSubledgers.length + report.bankAccounts.length),
        check(4, ReconciliationCheckCode.AR_CONTROL_VS_CUSTOMER_SUBLEDGER, ar),
        check(5, ReconciliationCheckCode.AP_CONTROL_VS_SUPPLIER_SUBLEDGER, ap),
        check(6, ReconciliationCheckCode.INVENTORY_GL_VS_STOCK_VALUATION, report.inventoryValuation.length),
        check(7, ReconciliationCheckCode.JOURNAL_ENTRIES_BALANCED, report.unbalancedEntries.length),
        check(8, ReconciliationCheckCode.MULTI_CURRENCY_BASE_CONSISTENT, report.multiCurrencyLines.length),
        check(null, ReconciliationCheckCode.STOCK_QUANTITY_PROJECTION, report.stockBalances.length),
    ];
}

const currencyKey = (currencyId: string | null) => currencyId ?? 'base';

/** Stable key per finding → |difference|. Keys identify "the same drift" across runs. */
export function fingerprintReport(report: BalanceDriftReportDto): Record<string, number> {
    const findings: Record<string, number> = {};
    const add = (key: string, difference: number) => {
        findings[key] = Math.abs(difference);
    };

    for (const f of report.cashSubledgers) add(`CASH_GL:${currencyKey(f.currencyId)}`, f.difference);
    for (const f of report.cashboxes) add(`CASHBOX:${f.cashboxId}`, f.difference);
    for (const f of report.bankSubledgers) add(`BANK_GL:${currencyKey(f.currencyId)}`, f.difference);
    for (const f of report.bankAccounts) add(`BANK_ACCOUNT:${f.bankAccountId}`, f.difference);
    for (const f of report.partySubledgers) add(`PARTY_${f.side}:${f.controlAccountId}:${currencyKey(f.currencyId)}`, f.difference);
    for (const f of report.inventoryValuation) add(`INVENTORY_GL:${f.inventoryAccountId}`, f.difference);
    for (const f of report.unbalancedEntries) add(`JE_UNBALANCED:${f.journalEntryId}`, f.difference);
    for (const f of report.multiCurrencyLines) add(`FX_LINE:${f.journalLineId}`, f.difference);
    for (const f of report.stockBalances) add(`STOCK_QTY:${f.warehouseId}:${f.itemId}`, f.difference);

    return findings;
}

/**
 * drift-baselines.md policy: pre-existing drift is not a regression, an increase is.
 * First run (no previous) establishes the baseline and reports nothing new.
 */
export function diffNewFindings(previous: Record<string, number> | null, current: Record<string, number>): string[] {
    if (previous === null) return [];
    return Object.entries(current)
        .filter(([key, magnitude]) => {
            const before = previous[key];
            return before === undefined || magnitude - before > GROWTH_TOLERANCE;
        })
        .map(([key]) => key)
        .sort();
}

/** Reads ReconciliationRun.findings (Json) back defensively. */
export function parseFindings(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, number> = {};
    for (const [key, magnitude] of Object.entries(value)) {
        if (typeof magnitude === 'number') out[key] = magnitude;
    }
    return out;
}
```

- [ ] **Step 4: Run the pure tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- reconciliation-checks`
Expected: 8 pass.

- [ ] **Step 5: Write the failing service test**

`apps/api/src/modules/accounting/reconciliation/services/business-setup-reconciliation.service.spec.ts`:

```ts
import { BalanceDriftReportDto } from '../dto/balance-drift.dto';
import { BusinessSetupReconciliationService } from './business-setup-reconciliation.service';

function build(patch: Partial<BalanceDriftReportDto>) {
    const report: BalanceDriftReportDto = { ...new BalanceDriftReportDto(), generatedAt: '2026-09-17T03:00:00.000Z', ...patch };
    const drift = { getReport: jest.fn().mockResolvedValue(report) };
    return { service: new BusinessSetupReconciliationService(drift as never), drift, report };
}

describe('BusinessSetupReconciliationService.evaluate', () => {
    it('passes a clean tenant with all 9 checks green', async () => {
        const { service, drift, report } = build({});
        const result = await service.evaluate('t1');
        expect(drift.getReport).toHaveBeenCalledWith('t1');
        expect(result.passed).toBe(true);
        expect(result.checks).toHaveLength(9);
        expect(result.generatedAt).toBe(report.generatedAt);
        expect(result.report).toBe(report);
    });

    it('fails when any single check fails', async () => {
        const { service } = build({
            unbalancedEntries: [{ journalEntryId: 'je1', number: 'JE-1', totalDebit: 1, totalCredit: 0, difference: 1 }],
        });
        const result = await service.evaluate('t1');
        expect(result.passed).toBe(false);
        expect(result.checks.find((c) => c.number === 7)).toMatchObject({ passed: false, findingCount: 1 });
    });
});
```

- [ ] **Step 6: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-reconciliation.service`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement and register**

`apps/api/src/modules/accounting/reconciliation/services/business-setup-reconciliation.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { BalanceDriftService } from './balance-drift.service';
import type { ReconciliationResultDto } from '../dto/reconciliation.dto';
import { buildChecks } from '../reconciliation-checks';

/**
 * Phase 7.4.1 — the reconciliation gate. Wraps BalanceDriftService (the queries)
 * and presents the 8-check stack. Phase 6's RECONCILIATION setup task and
 * Phase 10's readiness gate consume `evaluate().passed`.
 */
@Injectable()
export class BusinessSetupReconciliationService {
    constructor(private readonly drift: BalanceDriftService) {}

    async evaluate(tenantId: string): Promise<ReconciliationResultDto> {
        const report = await this.drift.getReport(tenantId);
        const checks = buildChecks(report);
        return {
            generatedAt: report.generatedAt,
            passed: checks.every((c) => c.passed),
            checks,
            report,
        };
    }
}
```

`reconciliation.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BalanceDriftService } from './services/balance-drift.service';
import { BusinessSetupReconciliationService } from './services/business-setup-reconciliation.service';
import { BalanceDriftController } from './controllers/balance-drift.controller';

@Module({
    controllers: [BalanceDriftController],
    providers: [BalanceDriftService, BusinessSetupReconciliationService],
    exports: [BalanceDriftService, BusinessSetupReconciliationService],
})
export class ReconciliationModule {}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting/reconciliation && pnpm --filter @devloggers/api typecheck`
Expected: all pass; typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/accounting/reconciliation
git commit -m "feat(reconciliation): 8-check reconciliation gate and finding fingerprints (Phase 7.4.1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12 — `ReconciliationRun` history + new-drift alerting (7.5.2)

**Files:**
- Create: `packages/db-prisma/src/schema/reconciliation.prisma`
- Modify: `packages/db-prisma/src/schema/tenant.prisma` (back-relation)
- Create: migration `<timestamp>_reconciliation_runs`
- Create: `apps/api/src/modules/accounting/reconciliation/repositories/reconciliation-runs.repository.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/dto/reconciliation-run.dto.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/events/reconciliation.events.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/services/reconciliation-monitor.service.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/services/reconciliation-monitor.service.spec.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/reconciliation.module.ts`

**Interfaces:**
- Consumes: `BusinessSetupReconciliationService.evaluate`, `fingerprintReport`, `diffNewFindings`, `parseFindings` (Task 11); `AuditWriter.record`, `SYSTEM_USER_ID` (Task 4); `RequestContext` (Task 1); `EventEmitter2`
- Produces:
  - `type ReconciliationTrigger = 'SCHEDULED' | 'MANUAL' | 'BUSINESS_SETUP'`
  - `ReconciliationRunsRepository`: `findLatest(tenantId)`, `create(data: Prisma.ReconciliationRunUncheckedCreateInput)`, `listRecent(tenantId, take)`, `listTenantIds(): Promise<string[]>`
  - `class ReconciliationRunResponseDto { id; trigger; passed; findingCount; newFindings: string[]; correlationId: string | null; createdAt: string }`
  - `toRunResponse(run: ReconciliationRun): ReconciliationRunResponseDto`
  - `ReconciliationDriftDetectedEvent` (`NAME = 'reconciliation.drift-detected'`; fields `tenantId`, `runId`, `newFindings`)
  - `ReconciliationMonitorService.runForTenant(tenantId: string, trigger: ReconciliationTrigger): Promise<ReconciliationRunResponseDto>` — the entry point Phase 6's `RECONCILIATION` task calls with `'BUSINESS_SETUP'` (7.5.3 hook)

Alert = all three of: a `warn` log line (JSON in production, carrying the correlationId), the `reconciliation.drift-detected` event (for future notification listeners), and a `RECONCILIATION_DRIFT_DETECTED` audit row. No email or notification channel is added in this phase.

- [ ] **Step 1: Schema**

`packages/db-prisma/src/schema/reconciliation.prisma`:

```prisma
// ─── Reconciliation Run ───────────────────────────────────────────────────────
/// Phase 7.5 — history of reconciliation runs. Each run stores its finding
/// fingerprints so the next run can detect NEW or GROWN drift (drift-baselines.md).
/// Append-only by convention: written once by ReconciliationMonitorService.
model ReconciliationRun {
    id            String   @id @default(uuid())
    tenantId      String   @map("tenant_id")
    /// SCHEDULED | MANUAL | BUSINESS_SETUP
    trigger       String
    passed        Boolean
    findingCount  Int      @map("finding_count")
    /// Record<fingerprint, |difference|> — see reconciliation-checks.ts
    findings      Json
    /// string[] — fingerprints new or grown vs the previous run
    newFindings   Json     @map("new_findings")
    /// Full ReconciliationResultDto at run time
    report        Json
    correlationId String?  @map("correlation_id")
    createdAt     DateTime @default(now()) @map("created_at")
    updatedAt     DateTime @updatedAt @map("updated_at")

    tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    @@index([tenantId, createdAt])
    @@map("reconciliation_runs")
}
```

In `packages/db-prisma/src/schema/tenant.prisma`, add next to `auditLogs AuditLog[]`:

```prisma
    reconciliationRuns ReconciliationRun[]
```

- [ ] **Step 2: Migration**

Run:
```bash
pnpm --filter @devloggers/db-prisma exec prisma migrate dev --schema=src/schema --create-only --name reconciliation_runs
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:generate
pnpm --filter @devloggers/db-prisma typecheck
```
Expected: the migration creates `reconciliation_runs` with an FK to `tenants` and the index; the client has `prisma.reconciliationRun`; typecheck exits 0. If the database is locked, follow the Global Constraints fallback.

- [ ] **Step 3: Write the failing monitor test**

`apps/api/src/modules/accounting/reconciliation/services/reconciliation-monitor.service.spec.ts`:

```ts
import { BalanceDriftReportDto } from '../dto/balance-drift.dto';
import type { ReconciliationResultDto } from '../dto/reconciliation.dto';
import { buildChecks } from '../reconciliation-checks';
import { ReconciliationMonitorService } from './reconciliation-monitor.service';
import { ReconciliationDriftDetectedEvent } from '../events/reconciliation.events';
import { RequestContext } from '../../../../common/request-context/request-context';

function result(cashboxDifference: number | null): ReconciliationResultDto {
    const report: BalanceDriftReportDto = {
        ...new BalanceDriftReportDto(),
        generatedAt: '2026-09-17T03:00:00.000Z',
        cashboxes:
            cashboxDifference === null
                ? []
                : [{ cashboxId: 'cb1', code: 'C', cachedBalance: cashboxDifference, derivedBalance: 0, difference: cashboxDifference }],
    };
    const checks = buildChecks(report);
    return { generatedAt: report.generatedAt, passed: checks.every((c) => c.passed), checks, report };
}

function build(current: ReconciliationResultDto, previousFindings: Record<string, number> | null) {
    const reconciliation = { evaluate: jest.fn().mockResolvedValue(current) };
    const runs = {
        findLatest: jest.fn().mockResolvedValue(previousFindings === null ? null : { findings: previousFindings }),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
            ...data,
            id: 'run-1',
            createdAt: new Date('2026-09-17T03:00:01.000Z'),
            updatedAt: new Date('2026-09-17T03:00:01.000Z'),
        })),
    };
    const emitter = { emit: jest.fn() };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ReconciliationMonitorService(reconciliation as never, runs as never, emitter as never, audit as never);
    return { service, runs, emitter, audit };
}

describe('ReconciliationMonitorService.runForTenant', () => {
    it('first run stores the baseline and raises no alert, even with drift', async () => {
        const { service, runs, emitter, audit } = build(result(5), null);
        const run = await RequestContext.run({ correlationId: 'corr-1', source: 'SCHEDULER' }, () =>
            service.runForTenant('t1', 'SCHEDULED'),
        );
        expect(runs.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                tenantId: 't1',
                trigger: 'SCHEDULED',
                passed: false,
                findingCount: 1,
                findings: { 'CASHBOX:cb1': 5 },
                newFindings: [],
                correlationId: 'corr-1',
            }),
        });
        expect(emitter.emit).not.toHaveBeenCalled();
        expect(audit.record).not.toHaveBeenCalled();
        expect(run).toEqual({
            id: 'run-1',
            trigger: 'SCHEDULED',
            passed: false,
            findingCount: 1,
            newFindings: [],
            correlationId: 'corr-1',
            createdAt: '2026-09-17T03:00:01.000Z',
        });
    });

    it('does not alert when drift is unchanged since the last run', async () => {
        const { service, emitter } = build(result(5), { 'CASHBOX:cb1': 5 });
        await service.runForTenant('t1', 'SCHEDULED');
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('alerts (event + audit) when drift grows', async () => {
        const { service, emitter, audit } = build(result(8), { 'CASHBOX:cb1': 5 });
        const run = await service.runForTenant('t1', 'MANUAL');
        expect(run.newFindings).toEqual(['CASHBOX:cb1']);
        expect(emitter.emit).toHaveBeenCalledWith(
            ReconciliationDriftDetectedEvent.NAME,
            new ReconciliationDriftDetectedEvent('t1', 'run-1', ['CASHBOX:cb1']),
        );
        expect(audit.record).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 't1',
                userId: 'system',
                action: 'RECONCILIATION_DRIFT_DETECTED',
                entityType: 'reconciliation_run',
                entityId: 'run-1',
                newValues: { newFindings: ['CASHBOX:cb1'], trigger: 'MANUAL' },
            }),
        );
    });

    it('alerts when drift appears on a previously clean tenant', async () => {
        const { service, emitter } = build(result(1), {});
        const run = await service.runForTenant('t1', 'SCHEDULED');
        expect(run.newFindings).toEqual(['CASHBOX:cb1']);
        expect(emitter.emit).toHaveBeenCalledTimes(1);
    });

    it('attributes the audit row to the request actor when there is one', async () => {
        const { service, audit } = build(result(2), {});
        await RequestContext.run({ userId: 'u1' }, () => service.runForTenant('t1', 'MANUAL'));
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
    });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- reconciliation-monitor`
Expected: FAIL — modules not found.

- [ ] **Step 5: Implement**

`apps/api/src/modules/accounting/reconciliation/repositories/reconciliation-runs.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma, ReconciliationRun } from '@devloggers/db-prisma';

@Injectable()
export class ReconciliationRunsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findLatest(tenantId: string): Promise<ReconciliationRun | null> {
        return this.prisma.reconciliationRun.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    }

    create(data: Prisma.ReconciliationRunUncheckedCreateInput): Promise<ReconciliationRun> {
        return this.prisma.reconciliationRun.create({ data });
    }

    listRecent(tenantId: string, take: number): Promise<ReconciliationRun[]> {
        return this.prisma.reconciliationRun.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take });
    }

    /** Scheduler fan-out. Cross-tenant by design — never exposed over HTTP. */
    async listTenantIds(): Promise<string[]> {
        const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
        return tenants.map((t) => t.id);
    }
}
```

`apps/api/src/modules/accounting/reconciliation/dto/reconciliation-run.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import type { ReconciliationRun } from '@devloggers/db-prisma';

export type ReconciliationTrigger = 'SCHEDULED' | 'MANUAL' | 'BUSINESS_SETUP';

export class ReconciliationRunResponseDto {
    @ApiProperty({ type: 'string' })
    id: string = '';

    @ApiProperty({ enum: ['SCHEDULED', 'MANUAL', 'BUSINESS_SETUP'], enumName: 'ReconciliationTrigger' })
    trigger: ReconciliationTrigger = 'MANUAL';

    @ApiProperty({ type: 'boolean' })
    passed: boolean = true;

    @ApiProperty({ type: 'number' })
    findingCount: number = 0;

    @ApiProperty({ type: 'string', isArray: true, description: 'Finding fingerprints new or grown since the previous run' })
    newFindings: string[] = [];

    @ApiProperty({ type: 'string', nullable: true })
    correlationId: string | null = null;

    @ApiProperty({ type: 'string', example: '2026-09-17T03:00:01.000Z' })
    createdAt: string = '';
}

function toTrigger(value: string): ReconciliationTrigger {
    return value === 'SCHEDULED' || value === 'BUSINESS_SETUP' ? value : 'MANUAL';
}

export function toRunResponse(run: ReconciliationRun): ReconciliationRunResponseDto {
    const newFindings = Array.isArray(run.newFindings)
        ? run.newFindings.filter((f): f is string => typeof f === 'string')
        : [];
    return {
        id: run.id,
        trigger: toTrigger(run.trigger),
        passed: run.passed,
        findingCount: run.findingCount,
        newFindings,
        correlationId: run.correlationId,
        createdAt: run.createdAt.toISOString(),
    };
}
```

`apps/api/src/modules/accounting/reconciliation/events/reconciliation.events.ts`:

```ts
/** Emitted when a run finds drift that is new or larger than the previous run's. */
export class ReconciliationDriftDetectedEvent {
    static readonly NAME = 'reconciliation.drift-detected';

    constructor(
        public readonly tenantId: string,
        public readonly runId: string,
        public readonly newFindings: string[],
    ) {}
}
```

`apps/api/src/modules/accounting/reconciliation/services/reconciliation-monitor.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@devloggers/db-prisma';
import { AuditWriter, SYSTEM_USER_ID } from '../../../audit/audit-writer.service';
import { RequestContext } from '../../../../common/request-context/request-context';
import { ReconciliationRunsRepository } from '../repositories/reconciliation-runs.repository';
import { BusinessSetupReconciliationService } from './business-setup-reconciliation.service';
import { diffNewFindings, fingerprintReport, parseFindings } from '../reconciliation-checks';
import { toRunResponse, type ReconciliationRunResponseDto, type ReconciliationTrigger } from '../dto/reconciliation-run.dto';
import { ReconciliationDriftDetectedEvent } from '../events/reconciliation.events';

/**
 * Phase 7.5 — runs the reconciliation gate, stores the run, and alerts only on
 * drift that is new or has grown since the previous run (drift-baselines.md).
 * Called by the daily scheduler, the manual endpoint, and (Phase 6) the
 * RECONCILIATION setup task with trigger 'BUSINESS_SETUP'.
 */
@Injectable()
export class ReconciliationMonitorService {
    private readonly logger = new Logger(ReconciliationMonitorService.name);

    constructor(
        private readonly reconciliation: BusinessSetupReconciliationService,
        private readonly runs: ReconciliationRunsRepository,
        private readonly emitter: EventEmitter2,
        private readonly audit: AuditWriter,
    ) {}

    async runForTenant(tenantId: string, trigger: ReconciliationTrigger): Promise<ReconciliationRunResponseDto> {
        const result = await this.reconciliation.evaluate(tenantId);
        const findings = fingerprintReport(result.report);
        const previous = await this.runs.findLatest(tenantId);
        const newFindings = diffNewFindings(previous ? parseFindings(previous.findings) : null, findings);
        const correlationId = RequestContext.correlationId() ?? null;

        const run = await this.runs.create({
            tenantId,
            trigger,
            passed: result.passed,
            findingCount: Object.keys(findings).length,
            findings,
            newFindings,
            report: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
            correlationId,
        });

        if (newFindings.length > 0) {
            this.logger.warn({ msg: 'reconciliation drift increased', tenantId, runId: run.id, trigger, newFindings });
            this.emitter.emit(
                ReconciliationDriftDetectedEvent.NAME,
                new ReconciliationDriftDetectedEvent(tenantId, run.id, newFindings),
            );
            await this.audit.record({
                tenantId,
                userId: RequestContext.get()?.userId ?? SYSTEM_USER_ID,
                action: 'RECONCILIATION_DRIFT_DETECTED',
                entityType: 'reconciliation_run',
                entityId: run.id,
                newValues: { newFindings, trigger },
            });
        }

        return toRunResponse(run);
    }
}
```

`reconciliation.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BalanceDriftService } from './services/balance-drift.service';
import { BusinessSetupReconciliationService } from './services/business-setup-reconciliation.service';
import { ReconciliationMonitorService } from './services/reconciliation-monitor.service';
import { ReconciliationRunsRepository } from './repositories/reconciliation-runs.repository';
import { BalanceDriftController } from './controllers/balance-drift.controller';

@Module({
    controllers: [BalanceDriftController],
    providers: [BalanceDriftService, BusinessSetupReconciliationService, ReconciliationRunsRepository, ReconciliationMonitorService],
    exports: [BalanceDriftService, BusinessSetupReconciliationService, ReconciliationMonitorService],
})
export class ReconciliationModule {}
```

Two Prisma typing notes:
- `findings` is `Record<string, number>` and `newFindings` is `string[]`; both are assignable to `Prisma.InputJsonValue` without a cast.
- If `tsc` rejects the `JSON.parse(...) as Prisma.InputJsonValue` line, keep the cast: `JSON.parse` returns `any`, and this is not an API DTO shape.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting/reconciliation && pnpm --filter @devloggers/api typecheck`
Expected: all pass (5 new); typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/db-prisma/src/schema apps/api/src/modules/accounting/reconciliation
git commit -m "feat(reconciliation): run history with new-drift detection and alerting (Phase 7.5.2)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 13 — Daily reconciliation job (7.5.1)

**Files:**
- Modify: `apps/api/package.json` (add `@nestjs/schedule`, approved in Task 0)
- Modify: `apps/api/src/app.module.ts` (`ScheduleModule.forRoot()`)
- Modify: `apps/api/src/config/envValidator.ts` (`RECONCILIATION_CRON_ENABLED`)
- Create: `apps/api/src/modules/accounting/reconciliation/services/reconciliation.scheduler.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/services/reconciliation.scheduler.spec.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/reconciliation.module.ts`

**Interfaces:**
- Consumes: `ReconciliationRunsRepository.listTenantIds()`, `ReconciliationMonitorService.runForTenant()` (Task 12); `RequestContext` (Task 1); `SYSTEM_USER_ID` (Task 4)
- Produces: `ReconciliationScheduler.runDaily(): Promise<void>` — cron `0 3 * * *` (03:00 server time). Tenants run sequentially, one correlation id per tenant, `source='SCHEDULER'`. A failure on one tenant is logged and the loop moves on. Env `RECONCILIATION_CRON_ENABLED=false` disables it.

Sequential on purpose: each run issues about 12 aggregate queries, and a parallel fan-out across tenants would pile that load onto one connection pool at 03:00.

- [ ] **Step 1: Install**

Run: `pnpm --filter @devloggers/api add @nestjs/schedule`
Expected: `apps/api/package.json` gains `"@nestjs/schedule": "^6.x"` (the major line that supports Nest 11; check that `pnpm why @nestjs/core` shows no peer warning).

- [ ] **Step 2: Write the failing test**

`apps/api/src/modules/accounting/reconciliation/services/reconciliation.scheduler.spec.ts`:

```ts
import { ReconciliationScheduler } from './reconciliation.scheduler';
import { RequestContext } from '../../../../common/request-context/request-context';

function build(enabled: string | undefined, tenantIds: string[]) {
    const contexts: Array<ReturnType<typeof RequestContext.get>> = [];
    const runs = { listTenantIds: jest.fn().mockResolvedValue(tenantIds) };
    const monitor = {
        runForTenant: jest.fn(async (tenantId: string) => {
            contexts.push(RequestContext.get());
            if (tenantId === 'bad') throw new Error('query timeout');
            return {};
        }),
    };
    const config = { get: jest.fn().mockReturnValue(enabled) };
    const scheduler = new ReconciliationScheduler(runs as never, monitor as never, config as never);
    return { scheduler, runs, monitor, contexts };
}

describe('ReconciliationScheduler.runDaily', () => {
    it('runs every tenant with its own scheduler context', async () => {
        const { scheduler, monitor, contexts } = build('true', ['t1', 't2']);
        await scheduler.runDaily();
        expect(monitor.runForTenant.mock.calls).toEqual([
            ['t1', 'SCHEDULED'],
            ['t2', 'SCHEDULED'],
        ]);
        expect(contexts[0]).toMatchObject({ source: 'SCHEDULER', tenantId: 't1', userId: 'system' });
        expect(contexts[1]).toMatchObject({ source: 'SCHEDULER', tenantId: 't2' });
        expect(contexts[0]?.correlationId).not.toBe(contexts[1]?.correlationId);
    });

    it('keeps going when one tenant fails', async () => {
        const { scheduler, monitor } = build(undefined, ['t1', 'bad', 't3']);
        await expect(scheduler.runDaily()).resolves.toBeUndefined();
        expect(monitor.runForTenant).toHaveBeenCalledTimes(3);
    });

    it('does nothing when disabled', async () => {
        const { scheduler, runs, monitor } = build('false', ['t1']);
        await scheduler.runDaily();
        expect(runs.listTenantIds).not.toHaveBeenCalled();
        expect(monitor.runForTenant).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- reconciliation.scheduler`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

`apps/api/src/modules/accounting/reconciliation/services/reconciliation.scheduler.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RequestContext } from '../../../../common/request-context/request-context';
import { SYSTEM_USER_ID } from '../../../audit/audit-writer.service';
import { ReconciliationRunsRepository } from '../repositories/reconciliation-runs.repository';
import { ReconciliationMonitorService } from './reconciliation-monitor.service';

/** Phase 7.5.1 — daily reconciliation per tenant; alerts come from the monitor. */
@Injectable()
export class ReconciliationScheduler {
    private readonly logger = new Logger(ReconciliationScheduler.name);

    constructor(
        private readonly runs: ReconciliationRunsRepository,
        private readonly monitor: ReconciliationMonitorService,
        private readonly config: ConfigService,
    ) {}

    @Cron('0 3 * * *', { name: 'reconciliation-daily' })
    async runDaily(): Promise<void> {
        if (this.config.get<string>('RECONCILIATION_CRON_ENABLED') === 'false') return;

        const tenantIds = await this.runs.listTenantIds();
        for (const tenantId of tenantIds) {
            await RequestContext.run(
                { correlationId: randomUUID(), source: 'SCHEDULER', tenantId, userId: SYSTEM_USER_ID },
                async () => {
                    try {
                        await this.monitor.runForTenant(tenantId, 'SCHEDULED');
                    } catch (err) {
                        this.logger.error({
                            msg: 'scheduled reconciliation failed',
                            tenantId,
                            error: err instanceof Error ? err.message : String(err),
                        });
                    }
                },
            );
        }
    }
}
```

`reconciliation.module.ts` — add `ReconciliationScheduler` to `providers` (import it from `./services/reconciliation.scheduler`).

`app.module.ts` — import and register once, next to `EventEmitterModule.forRoot(...)`:

```ts
import { ScheduleModule } from '@nestjs/schedule';
```

```ts
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
    ScheduleModule.forRoot(),
```

`envValidator.ts` — add (same string-boolean style as `AWS_S3_PATH_STYLE`):

```ts
    // Reconciliation (Phase 7.5)
    RECONCILIATION_CRON_ENABLED: Joi.string().valid('true', 'false').default('true'),
```

- [ ] **Step 5: Run the tests and confirm they pass; check spec generation does not hang**

Run: `pnpm --filter @devloggers/api test -- reconciliation.scheduler && pnpm --filter @devloggers/api typecheck && pnpm generate`
Expected: 3 pass; typecheck exits 0; `pnpm generate` exits on its own. `generate-spec.ts` calls `NestFactory.create` without `init()`/`listen()`, so cron jobs, which register on application bootstrap, never start. If it hangs, stop and report it; do not add a workaround.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/app.module.ts apps/api/src/config/envValidator.ts apps/api/src/modules/accounting/reconciliation
git commit -m "feat(reconciliation): daily per-tenant reconciliation job (Phase 7.5.1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 14 — Minimum API surface for tenant admins

**Files:**
- Create: `apps/api/src/modules/accounting/reconciliation/controllers/reconciliation.controller.ts`
- Create: `apps/api/src/modules/accounting/reconciliation/controllers/reconciliation.controller.spec.ts`
- Modify: `apps/api/src/modules/accounting/reconciliation/reconciliation.module.ts`
- Regenerated: `apps/api/openapi.yaml`, `packages/api-contracts/types/index.ts`

**Interfaces:**
- Consumes: `BusinessSetupReconciliationService.evaluate`, `ReconciliationMonitorService.runForTenant`, `ReconciliationRunsRepository.listRecent`, `toRunResponse`
- Produces (all JWT-guarded and tenant-scoped via `user.tenantId`):
  - `GET  /accounting/reconciliation/checks` → `ReconciliationResultDto` (live, read-only, nothing stored)
  - `GET  /accounting/reconciliation/runs` → `ReconciliationRunResponseDto[]` (last 30)
  - `POST /accounting/reconciliation/runs` → `ReconciliationRunResponseDto` (manual run; stored; audited by the interceptor as `RUN`)

The dashboard UI is optional in this phase (spec success criterion 4). No api-client class is added; Phase 10 adds one when it builds the screen.

- [ ] **Step 1: Write the failing test**

`apps/api/src/modules/accounting/reconciliation/controllers/reconciliation.controller.spec.ts`:

```ts
import { ReconciliationController } from './reconciliation.controller';

const user = { id: 'u1', tenantId: 't1', email: 'a@b.c' };

function build() {
    const reconciliation = { evaluate: jest.fn().mockResolvedValue({ passed: true, checks: [] }) };
    const monitor = { runForTenant: jest.fn().mockResolvedValue({ id: 'run-1' }) };
    const runs = {
        listRecent: jest.fn().mockResolvedValue([
            {
                id: 'run-0',
                tenantId: 't1',
                trigger: 'SCHEDULED',
                passed: true,
                findingCount: 0,
                findings: {},
                newFindings: [],
                report: {},
                correlationId: null,
                createdAt: new Date('2026-09-16T03:00:00.000Z'),
                updatedAt: new Date('2026-09-16T03:00:00.000Z'),
            },
        ]),
    };
    const controller = new ReconciliationController(reconciliation as never, monitor as never, runs as never);
    return { controller, reconciliation, monitor, runs };
}

describe('ReconciliationController', () => {
    it('evaluates the caller tenant only', async () => {
        const { controller, reconciliation } = build();
        const res = await controller.getChecks(user);
        expect(reconciliation.evaluate).toHaveBeenCalledWith('t1');
        expect(res).toMatchObject({ data: { passed: true } });
    });

    it('lists the last 30 runs for the caller tenant, presented', async () => {
        const { controller, runs } = build();
        const res = await controller.listRuns(user);
        expect(runs.listRecent).toHaveBeenCalledWith('t1', 30);
        expect(res).toMatchObject({ data: [{ id: 'run-0', trigger: 'SCHEDULED', createdAt: '2026-09-16T03:00:00.000Z' }] });
    });

    it('triggers a MANUAL run for the caller tenant', async () => {
        const { controller, monitor } = build();
        await controller.run(user);
        expect(monitor.runForTenant).toHaveBeenCalledWith('t1', 'MANUAL');
    });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @devloggers/api test -- reconciliation.controller`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`apps/api/src/modules/accounting/reconciliation/controllers/reconciliation.controller.ts`:

```ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import {
    ApiCreatedResponseStandard,
    ApiOkResponseStandard,
    ApiStandardErrors,
} from '../../../../common/decorators/api-swagger.decorators';
import { BusinessSetupReconciliationService } from '../services/business-setup-reconciliation.service';
import { ReconciliationMonitorService } from '../services/reconciliation-monitor.service';
import { ReconciliationRunsRepository } from '../repositories/reconciliation-runs.repository';
import { ReconciliationResultDto } from '../dto/reconciliation.dto';
import { ReconciliationRunResponseDto, toRunResponse } from '../dto/reconciliation-run.dto';

const RECENT_RUNS = 30;

@ApiTags('Accounting / Reconciliation')
@Controller('accounting/reconciliation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReconciliationController {
    constructor(
        private readonly reconciliation: BusinessSetupReconciliationService,
        private readonly monitor: ReconciliationMonitorService,
        private readonly runs: ReconciliationRunsRepository,
    ) {}

    @Get('checks')
    @ApiOperation({
        summary: 'Reconciliation checks (live)',
        description: 'Evaluates the 8-check reconciliation stack now. Read-only; nothing is stored.',
    })
    @ApiOkResponseStandard(ReconciliationResultDto, { description: 'Per-check pass/fail with full findings' })
    @ApiStandardErrors()
    async getChecks(@CurrentUser() user: RequestUser) {
        const result = await this.reconciliation.evaluate(user.tenantId);
        return ApiResponseBuilder.success(result, 'Reconciliation checks');
    }

    @Get('runs')
    @ApiOperation({ summary: 'Recent reconciliation runs', description: `The ${RECENT_RUNS} most recent stored runs, newest first.` })
    @ApiOkResponseStandard(ReconciliationRunResponseDto, { isArray: true, description: 'Run history' })
    @ApiStandardErrors()
    async listRuns(@CurrentUser() user: RequestUser) {
        const runs = await this.runs.listRecent(user.tenantId, RECENT_RUNS);
        return ApiResponseBuilder.success(runs.map(toRunResponse), 'Reconciliation runs');
    }

    @Post('runs')
    @ApiOperation({
        summary: 'Run reconciliation now',
        description: 'Evaluates and stores a MANUAL run. newFindings lists drift that is new or grown since the previous run.',
    })
    @ApiCreatedResponseStandard(ReconciliationRunResponseDto, { description: 'Stored run' })
    @ApiStandardErrors()
    async run(@CurrentUser() user: RequestUser) {
        const run = await this.monitor.runForTenant(user.tenantId, 'MANUAL');
        return ApiResponseBuilder.success(run, 'Reconciliation run');
    }
}
```

Note: the controller injects `ReconciliationRunsRepository` directly for a pure read. That is a small departure from "controllers call services". If the reviewer objects, add `ReconciliationMonitorService.listRecent(tenantId)` as a one-line pass-through and inject only the service.

`reconciliation.module.ts` — `controllers: [BalanceDriftController, ReconciliationController]`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @devloggers/api test -- src/modules/accounting/reconciliation && pnpm --filter @devloggers/api typecheck`
Expected: all pass; typecheck exits 0.

- [ ] **Step 5: Regenerate contracts and verify**

Run:
```bash
pnpm generate
grep -n "/accounting/reconciliation/checks\|/accounting/reconciliation/runs\|ReconciliationCheckCode\|ReconciliationTrigger" packages/api-contracts/types/index.ts
pnpm --filter @devloggers/api-contracts build
pnpm --filter @devloggers/dashboard typecheck
```
Expected: both paths and both enums appear; the contracts build and the dashboard typecheck both exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/accounting/reconciliation apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(reconciliation): checks and run-history endpoints (Phase 7)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 15 — Full verification, reconciliation gate, docs

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-07-audit-reconciliation-observability.md` (tick boxes, status, deviations)
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/README.md` (Phase 7 status, Q4 row)
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/drift-baselines.md`
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/00-open-issues.md` (audit and reconciliation rows → done)
- Create: `docs/drift-baseline-phase-7.json`

- [ ] **Step 1: Whole-package verification**

Run each command separately and paste the summary lines into the PR:
```bash
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/api typecheck
pnpm --filter @devloggers/api lint:ci
pnpm --filter @devloggers/db-prisma typecheck
pnpm generate
pnpm --filter @devloggers/api-contracts build
pnpm --filter @devloggers/dashboard typecheck
```
Expected: 0 failed tests; typechecks exit 0; `lint:ci` stays within its `--max-warnings 400` budget with 0 errors; generation and builds exit 0. Fix any failure before continuing. Do not mark anything done on a red run.

- [ ] **Step 2: End-to-end audit smoke (requires the running API + migrated dev DB)**

With a valid `$TOKEN` for a seeded tenant that has an open fiscal period, a cashbox and financial settings:
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "x-correlation-id: phase7-smoke-1" \
  http://localhost:4040/payments/<draft-payment-id>/post -o /dev/null -w "%{http_code}\n"
```
Then in `psql`:
```sql
SELECT source, action, entity_type, entity_id, user_id
FROM audit_logs WHERE correlation_id = 'phase7-smoke-1' ORDER BY created_at;
```
Expected: `201` (or `200`), and exactly two rows: `GL | JOURNAL_POST | journal_entry | <je id>` and `HTTP | POST | payments | <payment id>`. If the draft-payment route differs, find it with `grep -n "@Post" apps/api/src/modules/invoicing/payments/*.controller.ts`.

- [ ] **Step 3: Reconciliation gate on the Phase 3 acceptance data (manual, deviation 5)**

On a dev DB seeded with the Phase 3 opening scenario (opening session with cash, bank and party lines posted and locked, plus opening stock):
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4040/accounting/reconciliation/checks \
  | tee docs/drift-baseline-phase-7.json
```
Expected: `"passed": true`, and every entry in `checks` shows `"passed": true`.
If any check fails, do **not** edit the baseline to make it pass. Inspect `report.<section>` and decide which case it is:
- **(a) Real pre-existing drift** from data written before Phases 2/3/8 (e.g. `MISSING_AMOUNT` lines from before Task 8). Record it explicitly in `drift-baselines.md` as the accepted baseline, with the finding keys.
- **(b) A bug in a check.** Stop and debug it with superpowers:systematic-debugging.

Then trigger a stored run twice and confirm the second run raises no new drift:
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:4040/accounting/reconciliation/runs
curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:4040/accounting/reconciliation/runs
```
Expected: the second response has `"newFindings": []`.

- [ ] **Step 4: Update the docs**

- `phase-07-audit-reconciliation-observability.md`:
  - Set `**Status:** ✅ complete (7.1.4 / 7.5.3 hooks shipped; integration in Phase 6)`.
  - Tick 7.1.1–7.1.3, 7.2.1–7.2.3, 7.3.1–7.3.2, 7.4.1–7.4.8, 7.5.1–7.5.2.
  - Leave 7.1.4 and 7.5.3 unticked, each with the note "hook ready: `RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType } })` / `ReconciliationMonitorService.runForTenant(tenantId, 'BUSINESS_SETUP')` — wire in Phase 6".
  - Replace the Q4 "Open question" section with the decision recorded in Task 0.
  - Add a "Deviations" section that links to this plan.
- `README.md`: Phase 7 row → `✅ Complete`; Q4 row → the decision.
- `drift-baselines.md`:
  - Set the current baseline to `docs/drift-baseline-phase-7.json` (recorded with the date).
  - Note that check 2 now derives from the journal-line subledger, so older baselines are not comparable.
  - Replace "Checks today" with the 9-check list from `buildChecks`.
  - Replace the manual `curl` recording instructions with `POST /accounting/reconciliation/runs`, and note that the daily job stores runs automatically.
- `00-open-issues.md`: mark "`AuditLog` never written on mutations" and "Reconciliation incomplete" as resolved in Phase 7.
- Add to `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-06-business-setup-orchestration.md`, under its tasks, a note: "Phase 7 hooks: wrap each handler in `RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType } }, …)`; the RECONCILIATION task calls `ReconciliationMonitorService.runForTenant(tenantId, 'BUSINESS_SETUP')` and gates on `passed`. Add the audit assertion for handler commit (moved from Phase 7 done-when)."

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs(roadmap): Phase 7 complete — audit, reconciliation gate, observability

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| 7.1.1 Audit interceptor: actor, tenant, entity, action, diff, correlation id | 1, 3, 5 |
| 7.1.2 Redact secrets | 4 |
| 7.1.3 Audit failure does not fail business | 4 (`record`), 5 |
| 7.1.4 Setup operations tagged `BUSINESS_SETUP` + task type | 1, 4 (hook; integration Phase 6 — deviation 1) |
| 7.2.1 Journal post/reverse/period close always audited | 6, 7 |
| 7.2.2 Opening balance post/lock audited | 7 |
| 7.2.3 Append-only | 3 (trigger), 4 (no mutating API, pinned by test) |
| 7.3.1 JSON logger in production | 2 |
| 7.3.2 Correlation id request → transaction → audit row | 1, 2, 4, 6, 15 (smoke) |
| 7.4.1 `BusinessSetupReconciliationService` | 11 |
| 7.4.2 Check 1 | existing; surfaced in 11 |
| 7.4.3 Check 2 | 9 |
| 7.4.4 Check 3 | existing GL half + 9 (projection) |
| 7.4.5 Checks 4–5 | existing + 10 (`side`), 11 |
| 7.4.6 Check 6 | 10 |
| 7.4.7 Check 7 | existing; surfaced in 11 |
| 7.4.8 Check 8 | 8 (data fix), 10 |
| 7.5.1 Daily cron | 13 |
| 7.5.2 Alert on new drift vs baseline | 12 |
| 7.5.3 `RECONCILIATION` task calls service | 12 (hook; integration Phase 6 — deviation 1) |
| Q4 retention | 0, 15 |
| Success: drift report empty on clean tenant | 15 step 3 |
| Success: dashboard surface (minimum API) | 14 |
| Done-when: Phase 3 scenario passes gate | 15 step 3 (manual — deviation 5) |
| Done-when: audit asserted for payment post | 6 (facade test), 15 step 2 |
| Done-when: audit asserted for opening post | 7 |
| Done-when: audit asserted for setup handler commit | moved to Phase 6 (deviation 1) |
