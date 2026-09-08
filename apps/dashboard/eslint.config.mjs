import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message:
            "Avoid 'as unknown' — type the source value correctly instead. If this is a genuine escape hatch (e.g. bridging a generic UI library callback), add an inline eslint-disable-next-line with a comment explaining why.",
        },
        {
          selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
          message:
            "Avoid 'as never' — type the value correctly instead. If this is a genuine escape hatch, add an inline eslint-disable-next-line with a comment explaining why.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
