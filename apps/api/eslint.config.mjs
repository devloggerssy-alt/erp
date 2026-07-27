// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
    // Phase 1 boundary (F1): GL account-resolution / journal-posting internals
    // (accounting/accounts/services — JournalPostingService, OpeningBalancesService,
    // AccountsService, ...) may only be reached from outside accounting via the
    // accounting/posting barrel (AccountingPostingFacade + PostingIntent types).
    // Exempted as NOT GL-policy, and confirmed still legitimately imported directly
    // as of Phase 1: document-sequences (document numbering, unrelated to which GL
    // account gets hit), financial-settings + fiscal-periods (onboarding writes tenant
    // setup config, doesn't consume it for posting), accounts/utils (assertFiscalPeriodOpen /
    // assertAccountFitsSlot — shared guards, not account resolution). See
    // docs/superpowers/plans/2026-07-26-phase-1-gl-posting-port.md Task 18.
    files: ['src/modules/**/*.ts'],
    ignores: ['src/modules/accounting/**', '**/*.spec.ts', '**/*.spec-fixtures.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // The `ignore` package (gitignore semantics) backs this rule: a negation
          // cannot re-include a path whose parent directory is still excluded. So
          // `accounting/accounts` itself must be un-blocked before re-blocking its
          // services/repositories/presenters/controllers/dto/events subpaths and
          // its own accounts.module.ts — that's what lets the later
          // `!**/accounting/accounts/utils/**` exemption actually take effect.
          group: [
            '**/accounting/*',
            '**/accounting/*/**',
            '!**/accounting/posting',
            '!**/accounting/posting/**',
            '!**/accounting/document-sequences',
            '!**/accounting/document-sequences/**',
            '!**/accounting/financial-settings',
            '!**/accounting/financial-settings/**',
            '!**/accounting/fiscal-periods',
            '!**/accounting/fiscal-periods/**',
            '!**/accounting/accounts',
            '!**/accounting/accounts/**',
            '**/accounting/accounts/accounts.module',
            '**/accounting/accounts/services',
            '**/accounting/accounts/services/**',
            '**/accounting/accounts/repositories',
            '**/accounting/accounts/repositories/**',
            '**/accounting/accounts/presenters',
            '**/accounting/accounts/presenters/**',
            '**/accounting/accounts/controllers',
            '**/accounting/accounts/controllers/**',
            '**/accounting/accounts/dto',
            '**/accounting/accounts/dto/**',
            '**/accounting/accounts/events',
            '**/accounting/accounts/events/**',
          ],
          message:
            'Import GL account-resolution / journal-posting internals only via the ' +
            'accounting/posting barrel (AccountingPostingFacade + PostingIntent types). ' +
            'accounting/accounts/services (JournalPostingService, OpeningBalancesService, ' +
            'AccountsService, ...) is GL-internal as of Phase 1.',
        }],
      }],
    },
  },
);
