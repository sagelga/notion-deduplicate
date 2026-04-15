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
  // Disable specific rules for template-derived components
  {
    files: [
      "src/hooks/useTheme.tsx",
      "src/components/layout/Navbar.tsx",
      "src/components/cookies/CookieConsentBanner.tsx",
      "src/components/cookies/CookieSettingsModal.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Disable setState-in-effect for legitimate initialization patterns
  {
    files: [
      "src/components/DatabaseSelector.tsx",
      "src/components/DatabasePreviewTable.tsx",
      "src/components/table/Table.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Disable unused var warnings for components with optional props
  {
    files: [
      "src/components/DatabaseSelector.tsx",
      "src/components/DeduplicateView.tsx",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
