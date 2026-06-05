#!/usr/bin/env node
/**
 * wrap-imported-skills.mjs
 *
 * Imports a curated set of skills from sickn33/antigravity-awesome-skills
 * (MIT) into .ai/skills/_imports/<id>/ as:
 *   - UPSTREAM.md  : verbatim original from upstream
 *   - SKILL.md     : wrapper with ERP-specific trigger + the upstream body
 *
 * Usage:
 *   node scripts/wrap-imported-skills.mjs
 *
 * Env:
 *   AAS_SNAPSHOT   path to cloned upstream repo (default: %TEMP%/aas-snapshot on Windows,
 *                  /tmp/aas-snapshot elsewhere)
 *   AAS_SHA        upstream commit SHA to pin in frontmatter (auto-detected if unset)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir, platform } from "node:os";

// ---------------------------------------------------------------------------
// ERP-specific triggers — one short sentence per skill, tuned to this codebase
// ---------------------------------------------------------------------------
const TRIGGERS = {
  // A. Stack-specific
  "nestjs-expert":
    "Load when editing apps/api/src/modules/**, designing a NestJS module, or troubleshooting DI/guards/interceptors/pipes.",
  "prisma-expert":
    "Load when editing packages/db-prisma/**, designing a schema, writing migrations, or optimizing Prisma queries.",
  "monorepo-architect":
    "Load when changing turbo.json, pnpm-workspace.yaml, tsconfig.base.json, or making cross-package architectural decisions.",
  "turborepo-caching":
    "Load when tuning turbo pipelines, configuring remote cache, or debugging slow pnpm turbo runs.",
  "zod-validation-expert":
    "Load when designing api-contracts DTOs, NestJS DTOs, or runtime input validation in any package.",
  "openapi-spec-generation":
    "Load when adding a new resource to packages/api-contracts, or maintaining the generated OpenAPI spec.",
  "nextjs-app-router-patterns":
    "Load when editing apps/dashboard/app/**, designing route segments, or working with Server Components / RSC.",
  "typescript-expert":
    "Load when changing tsconfig*.json, designing shared types in packages/*, or fixing complex TS inference issues.",

  // B. Backend / API design
  "backend-dev-guidelines":
    "Load when designing a new resource module, refactoring a controller/service/repository, or setting up middleware.",
  "api-design-principles":
    "Load when defining REST routes, response envelopes, or pagination/auth/versioning strategy for the API.",
  "api-patterns":
    "Load when comparing REST/GraphQL/tRPC, choosing pagination or error shapes, or designing API versioning.",
  "database-migration":
    "Load when planning a non-trivial schema change, zero-downtime migration, or rollback procedure.",

  // C. Frontend
  "frontend-developer":
    "Load when building a new dashboard page, feature module under apps/dashboard/modules/**, or composing complex UI.",
  "react-best-practices":
    "Load when writing React components, hooks, or reviewing performance / re-render issues in apps/dashboard.",
  "shadcn":
    "Load when adding shadcn/ui components or styling forms, dialogs, tables, or other primitives in apps/dashboard.",

  // D. Architecture / DDD
  "ddd-tactical-patterns":
    "Load when designing a new domain (catalog, accounting, inventory, …) or refining aggregates/value-objects/domain events.",
  "architecture-patterns":
    "Load when evaluating Clean/Hexagonal/DDD tradeoffs for a new module or refactoring an existing one.",
  "architecture-decision-records":
    "Load when making a significant architectural choice — write an ADR under .ai/decisions/ (or repo-standard location).",

  // E. Testing / quality
  "test-driven-development":
    "Load when adding tests for a new feature, or when the team wants red-green-refactor discipline on a change.",
  "systematic-debugging":
    "Load when investigating a bug — root-cause first, fix second.",
  "e2e-testing-patterns":
    "Load when building or stabilizing an end-to-end suite across the dashboard or full-stack.",
  "playwright-skill":
    "Load when writing Playwright specs, debugging flaky browser tests, or setting up the test harness.",
  "code-review-checklist":
    "Load when reviewing a PR or doing self-review — functionality, security, perf, maintainability.",

  // F. Security
  "api-security-best-practices":
    "Load when designing new endpoints, handling input, or hardening authn/authz on the API.",
  "auth-implementation-patterns":
    "Load when implementing JWT, OAuth2, sessions, guards, or role-based access on the API or dashboard.",

  // G. Anti-slop / quality workflow (also pinned in .ai/rules/code-quality.md)
  "andrej-karpathy":
    "Load when planning or writing code — surgical changes, surface assumptions, verifiable success criteria.",
  "verification-before-completion":
    "Load before claiming a task is done — verify, don't assume.",
  "lint-and-validate":
    "Load after every edit — typecheck, lint, test, then claim completion.",
};

// ---------------------------------------------------------------------------
// Setup paths
// ---------------------------------------------------------------------------
const ROOT = resolve(process.cwd());
const TARGET_DIR = join(ROOT, ".ai", "skills", "_imports");

const SNAPSHOT =
  process.env.AAS_SNAPSHOT ||
  (platform === "win32"
    ? join(process.env.TEMP || tmpdir(), "aas-snapshot")
    : join(tmpdir(), "aas-snapshot"));

const SOURCE_DIR = join(SNAPSHOT, "skills");

if (!existsSync(SOURCE_DIR)) {
  console.error(`[wrap] Upstream snapshot not found at: ${SOURCE_DIR}`);
  console.error(`[wrap] Clone it with:`);
  console.error(
    `       git clone --depth 1 --branch v12.0.0 https://github.com/sickn33/antigravity-awesome-skills.git "${SNAPSHOT}"`,
  );
  process.exit(1);
}

const SHA =
  process.env.AAS_SHA ||
  execSync(`git -C "${SNAPSHOT}" rev-parse HEAD`, { encoding: "utf8" }).trim();
const SHORT_SHA = SHA.slice(0, 7);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFrontmatter(md) {
  const m = md.match(FRONTMATTER_RE);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body: md.slice(m[0].length) };
}

function serializeFrontmatter(obj) {
  return (
    "---\n" +
    Object.entries(obj)
      .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
      .join("\n") +
    "\n---\n\n"
  );
}

function detectLicense(meta) {
  return (meta.license || meta.license_source || "MIT").toString();
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log(`[wrap] Source:  ${SOURCE_DIR}`);
console.log(`[wrap] Target:  ${TARGET_DIR}`);
console.log(`[wrap] Upstream pinned SHA: ${SHORT_SHA}`);
console.log(`[wrap] Skills to import: ${Object.keys(TRIGGERS).length}`);

ensureDir(TARGET_DIR);

let okCount = 0;
let skipCount = 0;
const failures = [];

for (const [id, trigger] of Object.entries(TRIGGERS)) {
  const upstreamFile = join(SOURCE_DIR, id, "SKILL.md");
  if (!existsSync(upstreamFile)) {
    failures.push(id);
    console.error(`[wrap]   MISSING upstream: ${id}`);
    continue;
  }

  const upstreamRaw = readFileSync(upstreamFile, "utf8");
  const { meta, body } = parseFrontmatter(upstreamRaw);
  const upstreamDescription = (meta.description || "").toString().trim();
  const license = detectLicense(meta);

  const skillDir = join(TARGET_DIR, id);
  ensureDir(skillDir);

  // 1. Write UPSTREAM.md (verbatim)
  writeFileSync(join(skillDir, "UPSTREAM.md"), upstreamRaw, "utf8");

  // 2. Write SKILL.md (wrapper)
  const wrapperFm = {
    name: id,
    description: upstreamDescription
      ? `${upstreamDescription} | ERP trigger: ${trigger}`
      : trigger,
    source: "sickn33/antigravity-awesome-skills",
    upstream_sha: SHA,
    upstream_path: `skills/${id}/SKILL.md`,
    license,
    imported_with: "scripts/wrap-imported-skills.mjs",
  };

  const header =
    `# ${meta.name || id} — ERP Wrapper\n\n` +
    `> Imported from \`sickn33/antigravity-awesome-skills\` @ \`${SHORT_SHA}\` (${license}).\n` +
    `> Upstream body preserved verbatim in \`UPSTREAM.md\`.\n` +
    `> Do not edit body content here — refresh via the script instead.\n\n` +
    `## When to use in this ERP\n\n${trigger}\n\n---\n\n`;

  const wrapper =
    serializeFrontmatter(wrapperFm) + header + body.replace(/^\s+/, "");

  writeFileSync(join(skillDir, "SKILL.md"), wrapper, "utf8");

  okCount++;
  console.log(`[wrap]   + ${id}`);
}

if (failures.length) {
  console.error(`\n[wrap] FAILED to import: ${failures.length}`);
  for (const id of failures) console.error(`  - ${id}`);
  process.exit(1);
}

console.log(`\n[wrap] Done. ${okCount} imported, ${skipCount} skipped.`);
