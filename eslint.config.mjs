import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Relax some rules for existing code - can be tightened incrementally
  {
    rules: {
      // Allow unescaped entities in JSX (apostrophes, quotes)
      "react/no-unescaped-entities": "warn",
      // Allow unused variables (many pre-existing)
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow explicit any (used in several places)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow <a> tags for external links
      "@next/next/no-html-link-for-pages": "warn",
      // Allow prefer-const violations
      "prefer-const": "warn",
      // React hooks rules - demote to warnings for now
      "react-hooks/rules-of-hooks": "error", // Keep this as error (critical)
      "react-hooks/exhaustive-deps": "warn",
      // React 19 new rules - demote to warnings for pre-existing code
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
