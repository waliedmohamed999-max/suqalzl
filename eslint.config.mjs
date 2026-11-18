import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "spikes/**",
      "docs/**",
      "coverage/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  prettier,
  {
    rules: {
      // D12: no hosting-provider SDKs in app code.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@supabase/*"], message: "D12: the app must stay hosting-independent (no @supabase/*)." },
            { group: ["@google-cloud/*"], message: "D12: put provider SDKs behind src/lib/providers/* adapters." },
          ],
        },
      ],
      // SPEC §4: RLS protects against bugs, not SQL injection — unsafe raw SQL is forbidden.
      "no-restricted-properties": [
        "error",
        { property: "$queryRawUnsafe", message: "Forbidden (SPEC §4). Use $queryRaw tagged templates." },
        { property: "$executeRawUnsafe", message: "Forbidden (SPEC §4). Use $executeRaw tagged templates." },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // SPEC D7 / CLAUDE.md rule 5: money is integer halalas. parseFloat/toFixed on amounts is banned
    // outside the money/format modules.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/money.ts", "src/lib/format/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "parseFloat", message: "Money is Int halalas: use lib/money.ts (D7)." },
      ],
    },
  },
  {
    files: ["scripts/**/*.{ts,mjs}", "prisma/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
