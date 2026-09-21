import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Regeln aus CLAUDE.md, per Lint erzwungen.
const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "src/generated/**", "next-env.d.ts"],
  },
  {
    // Regel 6: localStorage nur in src/save/.
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["src/save/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "localStorage",
          message: "localStorage nur in src/save/ (CLAUDE.md, Regel 6).",
        },
        {
          object: "globalThis",
          property: "localStorage",
          message: "localStorage nur in src/save/ (CLAUDE.md, Regel 6).",
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: "localStorage nur in src/save/ (CLAUDE.md, Regel 6)." },
      ],
    },
  },
  {
    // Regel 5: Die Engine ist reines TypeScript – kein React, kein Next, keine UI.
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "next", "next/*"],
              message: "Die Engine darf kein React/Next benutzen (CLAUDE.md, Regel 5).",
            },
            {
              group: ["@/ui/*", "@/save/*", "@/app/*", "../ui/*", "../save/*"],
              message: "Die Engine darf nichts aus UI, Save oder App importieren (CLAUDE.md, Regel 5).",
            },
          ],
        },
      ],
      "no-restricted-globals": ["error", "window", "document", "localStorage", "sessionStorage"],
      "no-restricted-properties": "off",
    },
  },
];

export default config;
