# Test Coverage Gaps

Running log of **code that should have tests** but currently does not. This file
is the counterpart to the 2026-10-18 test cleanup (see [What was removed](#what-was-removed)),
which deleted low-value tests and, in doing so, exposed the gaps below.

Each entry names the source file, the behaviour worth pinning, and a suggested
test. Promote an entry out of this list once a real test exists.

---

## Code that should have tests

### 1. Item form validation & mapping — `apps/dashboard/modules/items/items.config.ts`
The deleted `items.config.test.ts` only re-asserted `z.enum(ITEM_TYPES)`. The
logic that actually needs coverage is untested:
- `itemFormSchema.superRefine` — when `openingStock` is true, `openingWarehouse`
  and `openingCount (> 0)` are required; both issues are added with the right paths.
- `mapItemToFormValues` — defaults for null/absent API fields (`itemType`,
  `isActive`, `customFields`, `galleryUrls`).
- `toCreate` / `toUpdate` — `openingStock` is only emitted when warehouse +
  count are present; `categoryId`/`baseUnitId` fallbacks.

### 2. Request-DTO required-field convention (real DTOs)
The deleted `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts`
proved the `!` vs value-initializer rule against *synthetic* classes, so a real
request DTO that regressed to an initializer would not have failed it.
Needs: a test (or a lint/AST rule) that enumerates the real Create/Update DTOs
and asserts an empty body is rejected for every required field. See
`.ai/skills/backend-resource-module/SKILL.md` → “DTO required `!`”.

### 3. Financial mappings handler — `apps/api/.../business-setup/handlers/financial-mappings.handler.ts`
The deleted spec asserted the handler's own hardcoded `{ completed: true, details: {} }`.
Needs: coverage of the real mapping into `FinancialSettingsService.upsert`
(optional-slot payloads).

### 4. System prompt content — `apps/api/src/modules/ai-agent/runtime/system-prompt.ts`
`buildSystemPrompt` is covered only for date injection now. The deleted regex
pins were brittle. Needs: assert that tool/domain names referenced by the prompt
actually exist in the AI tool registry (instead of matching prose).

### 5. AI tool catalog registration — `apps/api/src/modules/ai-agent/tools/ai-tool-catalog.spec.ts`
Magic totals (`toHaveLength(67)` / `(39)`) were removed. Needs: per-domain
registration invariants (e.g. every provider contributes its expected tool names)
so a legitimate new tool does not force a magic-number bump.

### 6. `StatusGuardedCrudService.createAs` implementations
The base class declares `createAs` abstract, so the removed block only tested the
spec's own fixture. Needs: tests for the concrete `createAs` implementations
(document-number allocation + actor stamping) in invoices/payments/etc.

### 7. Identity clients — rejection path
`packages/api-client/src/clients/identity-envelope.test.ts` covers the success
envelope. The `requireResponseData(undefined)` rejection branch (missing `data`)
is untested.

### 8. Invoice-cancelled posting policy — reversal dispatch
The deleted `invoice-cancelled.policy.spec.ts` only restated the `referenceType`
constant. If the registry dispatch contract matters, assert it once in the
policy-registry test (reversal behaviour itself is already covered by
`journal-posting.service.spec.ts`).

### 9. Bank-account & cashbox AI tools — `prepare` / `run`
`bank-accounts.ai-tools.spec.ts` and `cashboxes.ai-tools.spec.ts` were deleted:
they restated the declarative `defineCrudAiTools(...)` config and never exercised
`prepare`/`run`. If these tools need coverage, follow the sibling specs
(`invoices.ai-tools.spec.ts`) that drive the generated handlers.

### 10. Inventory stock output — `StockCountsService.post` / `InventoryService.registerOpeningStockTx`
Deleting `movement-characterization.spec.ts` removed the **only** tests for
`StockCountsService.post` and `registerOpeningStockTx`. These compute movement
rows, balances and GL intents — high value. Needs: targeted unit tests asserting
zero-variance skips, average-cost valuation without a balance, and the opening
GL intent.

### 11. No e2e runner, and dashboard tests do not run in CI
The Cypress suite was non-functional (inherited login helper that hit the wrong
host/path/response shape, plus English assertions against the `ar` default
locale) and has been removed entirely — `cypress` dependency, scripts, config
and `cypress/**` are gone. `apps/dashboard` Vitest also does not run in CI.
Needs: adopt an e2e runner (Playwright recommended), boot API + dashboard from
the runner, use a seeded test tenant + `storageState` auth, and wire both unit
and e2e into `.github/workflows/ci.yml`.

### 12. CI “Golden masters present” step is stale
`.github/workflows/ci.yml` checks for
`apps/api/src/modules/accounting/posting/__tests__/golden-master.spec.ts`, which
does not exist (pre-existing; only warns). Decide whether to write the posting
golden master or drop the step.

---

## What was removed

| Removed file | Category |
|--------------|----------|
| `apps/dashboard/__tmp-register-test.ts` | scratch file, never run |
| `apps/dashboard/cypress/e2e/customers/customer-form.cy.ts` | dead (wrong route/fields/endpoints) |
| `apps/dashboard/cypress/e2e/customers/customer-form-integration.cy.ts` | dead + duplicate |
| `apps/dashboard/cypress/fixtures/customers.json` | fixture only used by the two specs above |
| `apps/dashboard/cypress/e2e/settings.cy.ts` | non-functional (broken login helper + `ar` default locale) |
| `apps/dashboard/cypress/e2e/chart-of-accounts.cy.ts` | non-functional (same root causes) |
| `apps/dashboard/cypress/support/*`, `cypress.config.ts`, `cypress/tsconfig.json` | Cypress runner config for the specs above |
| `apps/dashboard/modules/items/items.config.test.ts` | tautology (re-tested `z.enum`) — see gap 1 |
| `apps/api/.../posting/policies/invoice-cancelled.policy.spec.ts` | tautology (constant) — see gap 8 |
| `apps/api/.../invoicing/bank-accounts/bank-accounts.ai-tools.spec.ts` | config restatement — see gap 9 |
| `apps/api/.../invoicing/cashboxes/cashboxes.ai-tools.spec.ts` | config restatement — see gap 9 |
| `apps/api/.../inventory/movements/__tests__/movement-characterization.spec.ts` | golden master — see gap 10 |
| `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts` | framework tautology — see gap 2 |
| `apps/api/.../business-setup/handlers/financial-mappings.handler.spec.ts` | mock echo — see gap 3 |

Also trimmed (kept the meaningful assertions):
- `ai-agent/tools/ai-tool-catalog.spec.ts` — dropped magic totals (gap 5).
- `ai-agent/runtime/system-prompt.spec.ts` — dropped prose-regex pins (gap 4).
- `business-setup/constants/skippable-tasks.spec.ts` — dropped constant restatements
  (policy already covered behaviourally by `business-setup-task.service.spec.ts`).
- `backend-core/src/base/status-guarded-crud-service.spec.ts` — dropped the
  `createAs` block that tested the spec's own fixture (gap 6).
- `api-client/src/infra/crud-client.type-test.ts` — renamed the suite off the
  “characterization” framing; assertions unchanged.
