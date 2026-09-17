// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { domainBoundaryConfigs } from './eslint/domain-boundaries.mjs';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // ── Escape-hatch gates (Phase 0.4) ───────────────────────────────────
      // Verified at 0 violations across src/**, so they are safe at error and
      // will catch the *next* one rather than the existing ones.
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',

      // `warn`, not `error`, deliberately: 67 explicit `any` remain in src/**
      // (+73 in specs), and most sit in files Phase 1 / 1.5 rewrite outright —
      // journal-posting, invoice-posting, payments, expenses, stock-counts,
      // inventory, reports. Fixing them now would be doing that work early and
      // in the wrong order. Flip to 'error' at the end of Phase 1.5, when those
      // files have been rewritten and the count should be near zero.
      // Ratchet: the count must not grow. Current baseline is 140.
      '@typescript-eslint/no-explicit-any': 'warn',

      // `_`-prefixed args are intentionally unused — required by an overridden
      // signature or by a Nest decorator that must stay on the method.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "@typescript-eslint/no-unsafe-return": 'off',
      "@typescript-eslint/no-unsafe-call": 'off',
      "@typescript-eslint/no-unsafe-member-access": 'off',
      "@typescript-eslint/no-unsafe-assignment": 'off',
      "@typescript-eslint/no-unsafe-enum-comparison": 'off',
      "@typescript-eslint/no-unsafe-expression": 'off',
      "@typescript-eslint/no-unsafe-function-type": 'off',
      "@typescript-eslint/no-unsafe-member-type": 'off',
      "@typescript-eslint/no-unsafe-property-type": 'off',
      "@typescript-eslint/no-unsafe-type-arguments": 'off',
      "@typescript-eslint/no-unsafe-type-assertion": 'off',
      "@typescript-eslint/no-unsafe-type-parameter": 'off',
      "@typescript-eslint/no-unsafe-type-parameter-type": 'off',
      "@typescript-eslint/no-unsafe-type-parameter-type-argument": 'off',
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    // Test doubles must match the async signatures they stand in for, so their
    // methods are `async` with nothing to await. That is the point of a stub,
    // not an oversight — requiring `await` here would only add noise.
    files: ['**/*.spec.ts', '**/__tests__/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // Phase 5.3.4 — financial documents and ledger rows are cancelled or
    // reversed, never hard-deleted. Allowlist, each reviewed:
    //   invoices.service.ts                — delete(): DRAFT-only, no HTTP route (pinned by invoices.delete-guard.spec.ts)
    //   expenses.service.ts                — remove(): DRAFT-only (pinned by expenses.delete-guard.spec.ts)
    //   opening-balance-sessions.service.ts — remove(): assertMutable, DRAFT-only
    //   data-reset.service.ts              — tenant-wide danger-zone reset, phrase-confirmed
    // Repository-based documents are covered by StatusGuardedCrudRepository instead.
    // See .ai/rules/api.md § Deletion semantics.
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.spec-fixtures.ts',
      '**/__tests__/**',
      'src/modules/invoicing/invoices/invoices.service.ts',
      'src/modules/invoicing/expenses/expenses.service.ts',
      'src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service.ts',
      'src/modules/identity/settings/services/data-reset.service.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(delete|deleteMany)$/]" +
            "[callee.object.type='MemberExpression']" +
            "[callee.object.property.name=/^(invoice|payment|expense|journalEntry|journalLine|stockMovement|stockCount|openingBalanceSession)$/]",
          message:
            'Financial documents and ledger rows are cancelled or reversed, never hard-deleted. ' +
            'Use the document\'s cancel/reverse flow. A DRAFT-only delete must be added to the reviewed ' +
            'allowlist in eslint.config.mjs. See .ai/rules/api.md § Deletion semantics.',
        },
      ],
    },
  },
  // Domain boundaries (Phase 1 accounting rule, generalized in Phase 5.2) —
  // see eslint/domain-boundaries.mjs for the table and why it is per-importer.
  ...domainBoundaryConfigs(),
);
