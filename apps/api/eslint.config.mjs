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
);
